import { describe, expect, it } from "vitest";
import type { CachedClose, DailyCloseCache } from "@/adapters/convex/daily-close-cache.type";
import { MarketDataError } from "@/adapters/market-data/market-data.errors";
import type { DailyClosesSnapshot, MarketDataProvider } from "@/adapters/market-data/market-data-provider.type";
import { PricesRequestError } from "./market-data.errors";
import { createMarketDataService } from "./market-data.service";

// Tuesday 2025-09-09 10:00 in New York → candidates Mon 09-08, Fri 09-05, Thu 09-04.
const NOW = Date.UTC(2025, 8, 9, 14, 0);

class MemoryCache implements DailyCloseCache {
  readonly rows = new Map<string, number | null>();
  saves = 0;

  constructor(seed: Record<string, Record<string, number | null>> = {}) {
    for (const [date, closes] of Object.entries(seed)) {
      for (const [ticker, close] of Object.entries(closes)) this.rows.set(`${date}|${ticker}`, close);
    }
  }

  async getByDate(date: string, tickers: readonly string[]): Promise<CachedClose[]> {
    return tickers
      .filter((ticker) => this.rows.has(`${date}|${ticker}`))
      .map((ticker) => ({ ticker, close: this.rows.get(`${date}|${ticker}`) ?? null }));
  }

  async saveMany(date: string, entries: readonly CachedClose[]): Promise<void> {
    this.saves += 1;
    for (const { ticker, close } of entries) {
      const key = `${date}|${ticker}`;
      if (!this.rows.has(key)) this.rows.set(key, close);
    }
  }
}

class FakeProvider implements MarketDataProvider {
  readonly requests: string[] = [];

  constructor(private readonly byDate: Record<string, Record<string, number> | "no-data" | Error>) {}

  async getDailyCloses(date: string, symbols: readonly string[]): Promise<DailyClosesSnapshot> {
    this.requests.push(date);
    const entry = this.byDate[date];
    if (entry instanceof Error) throw entry;
    if (entry === undefined || entry === "no-data") return { date, hasData: false, closes: {} };
    const closes = Object.fromEntries(Object.entries(entry).filter(([ticker]) => symbols.includes(ticker)));
    return { date, hasData: true, closes };
  }
}

function setup(
  byDate: ConstructorParameters<typeof FakeProvider>[0],
  seed?: ConstructorParameters<typeof MemoryCache>[0],
) {
  const provider = new FakeProvider(byDate);
  const cache = new MemoryCache(seed);
  const service = createMarketDataService({ provider, cache, now: () => NOW });
  return { provider, cache, service };
}

describe("getCurrentPrices", () => {
  it("fetches the latest trading day, caches it, and reports missing symbols", async () => {
    const { provider, cache, service } = setup({ "2025-09-08": { AAPL: 230.5, MSFT: 500 } });

    const response = await service.getCurrentPrices(["aapl", "MSFT", "ZZZZ"]);

    expect(response).toEqual({
      asOfDate: "2025-09-08",
      prices: { AAPL: 230.5, MSFT: 500 },
      missing: ["ZZZZ"],
      fetchedAt: NOW,
    });
    expect(provider.requests).toEqual(["2025-09-08"]);
    expect(cache.rows.get("2025-09-08|ZZZZ")).toBeNull();
  });

  it("serves a fully cached date without calling the provider", async () => {
    const { provider, service } = setup({}, { "2025-09-08": { AAPL: 230.5, ZZZZ: null } });

    const response = await service.getCurrentPrices(["AAPL", "ZZZZ"]);

    expect(response.prices).toEqual({ AAPL: 230.5 });
    expect(response.missing).toEqual(["ZZZZ"]);
    expect(provider.requests).toEqual([]);
  });

  it("calls the provider when only some symbols are cached", async () => {
    const { provider, service } = setup({ "2025-09-08": { AAPL: 230.5, MSFT: 500 } }, { "2025-09-08": { AAPL: 230.5 } });

    const response = await service.getCurrentPrices(["AAPL", "MSFT"]);

    expect(response.prices).toEqual({ AAPL: 230.5, MSFT: 500 });
    expect(provider.requests).toEqual(["2025-09-08"]);
  });

  it("falls back past a holiday and remembers it for later requests", async () => {
    const { provider, service } = setup({ "2025-09-08": "no-data", "2025-09-05": { AAPL: 229 } });

    const first = await service.getCurrentPrices(["AAPL"]);
    const second = await service.getCurrentPrices(["AAPL"]);

    expect(first.asOfDate).toBe("2025-09-05");
    expect(second.asOfDate).toBe("2025-09-05");
    expect(provider.requests).toEqual(["2025-09-08", "2025-09-05"]);
  });

  it("uses the New York date, not UTC", async () => {
    // 2025-09-09 02:00 UTC is still Monday 09-08 in New York → first candidate Friday 09-05.
    const provider = new FakeProvider({ "2025-09-05": { AAPL: 229 } });
    const service = createMarketDataService({
      provider,
      cache: new MemoryCache(),
      now: () => Date.UTC(2025, 8, 9, 2, 0),
    });

    expect((await service.getCurrentPrices(["AAPL"])).asOfDate).toBe("2025-09-05");
    expect(provider.requests[0]).toBe("2025-09-05");
  });

  it("throws NO_DATA when no candidate date has data", async () => {
    const { provider, service } = setup({});
    const error = await service.getCurrentPrices(["AAPL"]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PricesRequestError);
    expect(error).toMatchObject({ code: "NO_DATA" });
    expect(provider.requests).toHaveLength(3);
  });

  it("propagates provider errors such as rate limiting without caching", async () => {
    const { cache, service } = setup({ "2025-09-08": new MarketDataError("RATE_LIMITED", "429", 429) });
    const error = await service.getCurrentPrices(["AAPL"]).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "RATE_LIMITED" });
    expect(cache.saves).toBe(0);
  });

  it.each([
    [["AAPL", "BAD$"], ["BAD$"]],
    [[""], [""]],
  ])("rejects invalid symbols %j before any lookup", async (symbols, invalid) => {
    const { provider, service } = setup({});
    const error = await service.getCurrentPrices(symbols).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "INVALID_SYMBOLS", invalidSymbols: invalid });
    expect(provider.requests).toEqual([]);
  });

  it("rejects more symbols than allowed per request", async () => {
    const { service } = setup({});
    const many = Array.from({ length: 51 }, (_, i) => `T${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`);
    await expect(service.getCurrentPrices(many)).rejects.toMatchObject({ code: "INVALID_SYMBOLS" });
  });
});
