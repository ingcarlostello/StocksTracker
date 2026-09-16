import { describe, expect, it } from "vitest";
import type { CachedClose, DailyCloseCache } from "@/adapters/convex/daily-close-cache.type";
import { MarketDataError } from "@/adapters/market-data/market-data.errors";
import type { DailyClosesSnapshot, MarketDataProvider } from "@/adapters/market-data/market-data-provider.type";
import { PricesRequestError } from "./market-data.errors";
import { createMarketDataService } from "./market-data.service";

// Tuesday 2025-09-09 10:00 in New York → candidates Mon 09-08, Fri 09-05, Thu 09-04.
const NOW = Date.UTC(2025, 8, 9, 14, 0);
// Tuesday 2026-09-15 10:00 in New York: 2025 and earlier are past years, 2026 is not.
const YEAR_END_NOW = Date.UTC(2026, 8, 15, 14, 0);
// Monday 2026-01-05 09:00 in New York → current candidates Fri 01-02, Thu 01-01, Wed 2025-12-31.
const EARLY_JANUARY_NOW = Date.UTC(2026, 0, 5, 14, 0);

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
  now: number = NOW,
) {
  const provider = new FakeProvider(byDate);
  const cache = new MemoryCache(seed);
  const service = createMarketDataService({ provider, cache, now: () => now });
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

  it("surfaces a 403 untranslated and never treats it as a history limit", async () => {
    const { provider, service } = setup({ "2025-09-08": new MarketDataError("NOT_ENTITLED", "403", 403) });

    const error = await service.getCurrentPrices(["AAPL"]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MarketDataError);
    expect(error).toMatchObject({ code: "NOT_ENTITLED" });
    // Not memoised: the same candidate is requested again.
    await expect(service.getCurrentPrices(["AAPL"])).rejects.toBeInstanceOf(MarketDataError);
    expect(provider.requests).toEqual(["2025-09-08", "2025-09-08"]);
  });
});

describe("getYearEndPrices", () => {
  it("fetches the year's last trading day and caches it", async () => {
    const { provider, cache, service } = setup({ "2025-12-31": { AAPL: 250 } }, undefined, YEAR_END_NOW);

    const response = await service.getYearEndPrices(["aapl"], "2025");

    expect(response).toEqual({
      asOfDate: "2025-12-31",
      prices: { AAPL: 250 },
      missing: [],
      fetchedAt: YEAR_END_NOW,
    });
    expect(provider.requests).toEqual(["2025-12-31"]);
    expect(cache.rows.get("2025-12-31|AAPL")).toBe(250);
  });

  it("serves a fully cached year end without calling the provider", async () => {
    const { provider, service } = setup({}, { "2025-12-31": { AAPL: 250, ZZZZ: null } }, YEAR_END_NOW);

    const response = await service.getYearEndPrices(["AAPL", "ZZZZ"], "2025");

    expect(response.asOfDate).toBe("2025-12-31");
    expect(response.prices).toEqual({ AAPL: 250 });
    expect(response.missing).toEqual(["ZZZZ"]);
    expect(provider.requests).toEqual([]);
  });

  it("starts at Dec 30 when Dec 31 falls on a weekend", async () => {
    const { provider, service } = setup({ "2022-12-30": { AAPL: 130 } }, undefined, YEAR_END_NOW);

    const response = await service.getYearEndPrices(["AAPL"], "2022");

    expect(response.asOfDate).toBe("2022-12-30");
    expect(provider.requests).toEqual(["2022-12-30"]);
  });

  it("falls back past a year-end holiday and remembers it", async () => {
    const { provider, service } = setup(
      { "2025-12-31": "no-data", "2025-12-30": { AAPL: 249, MSFT: 400 } },
      undefined,
      YEAR_END_NOW,
    );

    const first = await service.getYearEndPrices(["AAPL"], "2025");
    const second = await service.getYearEndPrices(["MSFT"], "2025");

    expect(first.asOfDate).toBe("2025-12-30");
    expect(second.asOfDate).toBe("2025-12-30");
    expect(provider.requests).toEqual(["2025-12-31", "2025-12-30", "2025-12-30"]);
  });

  it.each(["2026", "2027", "1969", "", "abc", "25", "2025.0"])(
    "rejects the year %j before any lookup",
    async (year) => {
      const { provider, service } = setup({ "2025-12-31": { AAPL: 250 } }, undefined, YEAR_END_NOW);

      const error = await service.getYearEndPrices(["AAPL"], year).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(PricesRequestError);
      expect(error).toMatchObject({ code: "INVALID_YEAR" });
      expect(provider.requests).toEqual([]);
    },
  );

  it("reports invalid symbols before an invalid year", async () => {
    const { service } = setup({}, undefined, YEAR_END_NOW);

    const error = await service.getYearEndPrices(["BAD$"], "2027").catch((e: unknown) => e);

    expect(error).toMatchObject({ code: "INVALID_SYMBOLS", invalidSymbols: ["BAD$"] });
  });

  it("turns an old 403 with nothing cached into HISTORY_UNAVAILABLE and stops asking", async () => {
    const { provider, service } = setup(
      { "2023-12-29": new MarketDataError("NOT_ENTITLED", "403", 403) },
      undefined,
      YEAR_END_NOW,
    );

    const error = await service.getYearEndPrices(["AAPL"], "2023").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PricesRequestError);
    expect(error).toMatchObject({ code: "HISTORY_UNAVAILABLE" });
    expect(provider.requests).toEqual(["2023-12-29"]);

    // The memo is monotone: 2023 again, and every older year, are refused without a request.
    await expect(service.getYearEndPrices(["AAPL"], "2023")).rejects.toMatchObject({
      code: "HISTORY_UNAVAILABLE",
    });
    await expect(service.getYearEndPrices(["AAPL"], "2021")).rejects.toMatchObject({
      code: "HISTORY_UNAVAILABLE",
    });
    expect(provider.requests).toEqual(["2023-12-29"]);
  });

  it("answers an old 403 with the closes already cached for that date", async () => {
    const { provider, service } = setup(
      { "2023-12-29": new MarketDataError("NOT_ENTITLED", "403", 403) },
      { "2023-12-29": { AAPL: 190 } },
      YEAR_END_NOW,
    );

    const response = await service.getYearEndPrices(["AAPL", "MSFT"], "2023");

    expect(response).toEqual({
      asOfDate: "2023-12-29",
      prices: { AAPL: 190 },
      missing: ["MSFT"],
      fetchedAt: YEAR_END_NOW,
    });
    expect(provider.requests).toEqual(["2023-12-29"]);

    const afterMemo = await service.getYearEndPrices(["AAPL", "MSFT"], "2023");

    expect(afterMemo.prices).toEqual({ AAPL: 190 });
    expect(afterMemo.missing).toEqual(["MSFT"]);
    expect(provider.requests).toEqual(["2023-12-29"]);
  });

  it("propagates a 403 on a date too young to be a history limit", async () => {
    // 2027-01-02 09:00 in New York: the 2026-12-31 close is 2 days old, so the 403 is transient.
    const { provider, service } = setup(
      { "2026-12-31": new MarketDataError("NOT_ENTITLED", "403", 403) },
      undefined,
      Date.UTC(2027, 0, 2, 14, 0),
    );

    const error = await service.getYearEndPrices(["AAPL"], "2026").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MarketDataError);
    expect(error).toMatchObject({ code: "NOT_ENTITLED" });
    await expect(service.getYearEndPrices(["AAPL"], "2026")).rejects.toBeInstanceOf(MarketDataError);
    expect(provider.requests).toEqual(["2026-12-31", "2026-12-31"]);
  });

  it("serves cached closes for a date outside the provider's history", async () => {
    const { provider, service } = setup(
      { "2023-12-29": new MarketDataError("NOT_ENTITLED", "403", 403) },
      { "2023-12-29": { AAPL: 190, MSFT: 370 } },
      YEAR_END_NOW,
    );

    const response = await service.getYearEndPrices(["AAPL", "MSFT"], "2023");

    expect(response.asOfDate).toBe("2023-12-29");
    expect(response.prices).toEqual({ AAPL: 190, MSFT: 370 });
    expect(provider.requests).toEqual([]);
  });
});

describe("non-trading dates shared by both price paths", () => {
  const BY_DATE = {
    "2026-01-02": "no-data",
    "2026-01-01": "no-data",
    "2025-12-31": "no-data",
    "2025-12-30": { AAPL: 249 },
  } as const;

  it("skips a date the current-price walk already found empty", async () => {
    const { provider, service } = setup({ ...BY_DATE }, undefined, EARLY_JANUARY_NOW);

    await expect(service.getCurrentPrices(["AAPL"])).rejects.toMatchObject({ code: "NO_DATA" });
    const response = await service.getYearEndPrices(["AAPL"], "2025");

    expect(response.asOfDate).toBe("2025-12-30");
    expect(provider.requests).toEqual(["2026-01-02", "2026-01-01", "2025-12-31", "2025-12-30"]);
  });

  it("skips a date the year-end walk already found empty", async () => {
    const { provider, service } = setup({ ...BY_DATE }, undefined, EARLY_JANUARY_NOW);

    const response = await service.getYearEndPrices(["AAPL"], "2025");
    await expect(service.getCurrentPrices(["AAPL"])).rejects.toMatchObject({ code: "NO_DATA" });

    expect(response.asOfDate).toBe("2025-12-30");
    expect(provider.requests).toEqual(["2025-12-31", "2025-12-30", "2026-01-02", "2026-01-01"]);
  });
});
