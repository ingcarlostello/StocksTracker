import type { CachedClose, DailyCloseCache } from "@/adapters/convex/daily-close-cache.type";
import type { MarketDataProvider } from "@/adapters/market-data/market-data-provider.type";
import { MAX_SYMBOLS_PER_REQUEST } from "@/domain/market-data/market-data.constants";
import { normalizeSymbols } from "@/domain/market-data/symbol.service";
import { candidateTradingDates } from "@/domain/market-data/trading-date.service";
import { MARKET_TIME_ZONE } from "@/domain/transactions/transaction.constants";
import type { PricesResponse } from "@/types/prices-response.type";
import { todayIsoInTimeZone } from "@/utils/date.utils";
import { PricesRequestError } from "./market-data.errors";

type MarketDataServiceDeps = {
  provider: MarketDataProvider;
  cache: DailyCloseCache;
  now: () => number;
};

export type MarketDataService = {
  getCurrentPrices(rawSymbols: readonly string[]): Promise<PricesResponse>;
};

function validSymbolsOrThrow(rawSymbols: readonly string[]): string[] {
  const { symbols, invalid } = normalizeSymbols(rawSymbols);
  if (invalid.length > 0) {
    throw new PricesRequestError("INVALID_SYMBOLS", "Some symbols are not valid tickers", invalid);
  }
  if (symbols.length === 0) {
    throw new PricesRequestError("INVALID_SYMBOLS", "At least one symbol is required");
  }
  if (symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    throw new PricesRequestError("INVALID_SYMBOLS", `At most ${MAX_SYMBOLS_PER_REQUEST} symbols per request`);
  }
  return symbols;
}

export function createMarketDataService({ provider, cache, now }: MarketDataServiceDeps): MarketDataService {
  // Past dates that returned no market data (weekends/holidays) never gain data; skip them without a request.
  const nonTradingDates = new Set<string>();

  function toResponse(date: string, symbols: readonly string[], closes: readonly CachedClose[]): PricesResponse {
    const closeByTicker = new Map(closes.map((entry) => [entry.ticker, entry.close]));
    const prices: Record<string, number> = {};
    const missing: string[] = [];
    for (const symbol of symbols) {
      const close = closeByTicker.get(symbol) ?? null;
      if (close === null) missing.push(symbol);
      else prices[symbol] = close;
    }
    return { asOfDate: date, prices, missing, fetchedAt: now() };
  }

  async function getCurrentPrices(rawSymbols: readonly string[]): Promise<PricesResponse> {
    const symbols = validSymbolsOrThrow(rawSymbols);
    const today = todayIsoInTimeZone(MARKET_TIME_ZONE, now());

    for (const date of candidateTradingDates(today)) {
      if (nonTradingDates.has(date)) continue;

      const cached = await cache.getByDate(date, symbols);
      if (cached.length === symbols.length) return toResponse(date, symbols, cached);

      const snapshot = await provider.getDailyCloses(date, symbols);
      if (!snapshot.hasData) {
        nonTradingDates.add(date);
        continue;
      }

      const entries: CachedClose[] = symbols.map((ticker) => ({
        ticker,
        close: Object.hasOwn(snapshot.closes, ticker) ? snapshot.closes[ticker] : null,
      }));
      await cache.saveMany(date, entries);
      return toResponse(date, symbols, entries);
    }

    throw new PricesRequestError("NO_DATA", "No recent trading day with published closes was found");
  }

  return { getCurrentPrices };
}
