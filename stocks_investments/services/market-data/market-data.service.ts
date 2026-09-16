import type { CachedClose, DailyCloseCache } from "@/adapters/convex/daily-close-cache.type";
import { MarketDataError } from "@/adapters/market-data/market-data.errors";
import type { DailyClosesSnapshot, MarketDataProvider } from "@/adapters/market-data/market-data-provider.type";
import {
  HISTORY_LIMIT_MIN_AGE_DAYS,
  MAX_SYMBOLS_PER_REQUEST,
  PERFORMANCE_MIN_YEAR,
  YEAR_PARAM_REGEX,
} from "@/domain/market-data/market-data.constants";
import { normalizeSymbols } from "@/domain/market-data/symbol.service";
import { candidateTradingDates, yearEndCandidateDates } from "@/domain/market-data/trading-date.service";
import { MARKET_TIME_ZONE } from "@/domain/transactions/transaction.constants";
import type { PricesResponse } from "@/types/prices-response.type";
import { dayIndex, todayIsoInTimeZone, yearOfIsoDate } from "@/utils/date.utils";
import { PricesRequestError } from "./market-data.errors";

type MarketDataServiceDeps = {
  provider: MarketDataProvider;
  cache: DailyCloseCache;
  now: () => number;
};

export type MarketDataService = {
  getCurrentPrices(rawSymbols: readonly string[]): Promise<PricesResponse>;
  getYearEndPrices(rawSymbols: readonly string[], rawYear: string): Promise<PricesResponse>;
};

type CandidateWalkPolicy = {
  today: string;
  // Only historical dates can fall outside the provider's entitlement window; recent ones never do.
  historyAware: boolean;
  noDataMessage: string;
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

function validYearOrThrow(rawYear: string, today: string): number {
  if (!YEAR_PARAM_REGEX.test(rawYear)) {
    throw new PricesRequestError("INVALID_YEAR", "Year must be four digits");
  }
  const year = Number(rawYear);
  if (year < PERFORMANCE_MIN_YEAR) {
    throw new PricesRequestError("INVALID_YEAR", `Year must be ${PERFORMANCE_MIN_YEAR} or later`);
  }
  // The running year has no year-end close; its value comes from the current-price path.
  if (year >= yearOfIsoDate(today)) {
    throw new PricesRequestError("INVALID_YEAR", "Year-end closes exist only for years that have ended");
  }
  return year;
}

// Massive answers 403 both for a close that is not published yet and for a date beyond the plan's history,
// and only the message text tells them apart. Decide by age instead of parsing it.
function isHistoryLimit(error: unknown, date: string, today: string): boolean {
  return (
    error instanceof MarketDataError &&
    error.code === "NOT_ENTITLED" &&
    dayIndex(today) - dayIndex(date) >= HISTORY_LIMIT_MIN_AGE_DAYS
  );
}

function laterIsoDate(current: string | null, date: string): string {
  return current === null || date > current ? date : current;
}

export function createMarketDataService({ provider, cache, now }: MarketDataServiceDeps): MarketDataService {
  // Past dates that returned no market data (weekends/holidays) never gain data; skip them without a request.
  const nonTradingDates = new Set<string>();
  // Newest date the provider refused as outside its history. The window only moves forward, so every older
  // date is refused too and costs no request.
  let historyLimitDate: string | null = null;

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

  // Closes fetched while the date was still inside the window stay valid forever, so a partial cache is a
  // normal response naming the tickers it lacks; only a date with nothing cached is unavailable.
  function partialOrThrow(
    date: string,
    symbols: readonly string[],
    cached: readonly CachedClose[],
  ): PricesResponse {
    if (cached.length > 0) return toResponse(date, symbols, cached);
    throw new PricesRequestError(
      "HISTORY_UNAVAILABLE",
      `Closes for ${date} are outside the history the market data plan provides`,
    );
  }

  async function closesOnLatestTradingDate(
    symbols: string[],
    candidates: readonly string[],
    policy: CandidateWalkPolicy,
  ): Promise<PricesResponse> {
    for (const date of candidates) {
      if (nonTradingDates.has(date)) continue;

      const cached = await cache.getByDate(date, symbols);
      if (cached.length === symbols.length) return toResponse(date, symbols, cached);

      if (policy.historyAware && historyLimitDate !== null && date <= historyLimitDate) {
        return partialOrThrow(date, symbols, cached);
      }

      let snapshot: DailyClosesSnapshot;
      try {
        snapshot = await provider.getDailyCloses(date, symbols);
      } catch (error) {
        // The entitlement window is a suffix of the calendar: older candidates would only repeat the 403.
        if (policy.historyAware && isHistoryLimit(error, date, policy.today)) {
          historyLimitDate = laterIsoDate(historyLimitDate, date);
          return partialOrThrow(date, symbols, cached);
        }
        throw error;
      }
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

    throw new PricesRequestError("NO_DATA", policy.noDataMessage);
  }

  async function getCurrentPrices(rawSymbols: readonly string[]): Promise<PricesResponse> {
    const symbols = validSymbolsOrThrow(rawSymbols);
    const today = todayIsoInTimeZone(MARKET_TIME_ZONE, now());

    return closesOnLatestTradingDate(symbols, candidateTradingDates(today), {
      today,
      historyAware: false,
      noDataMessage: "No recent trading day with published closes was found",
    });
  }

  async function getYearEndPrices(rawSymbols: readonly string[], rawYear: string): Promise<PricesResponse> {
    const symbols = validSymbolsOrThrow(rawSymbols);
    const today = todayIsoInTimeZone(MARKET_TIME_ZONE, now());
    const year = validYearOrThrow(rawYear, today);

    return closesOnLatestTradingDate(symbols, yearEndCandidateDates(year), {
      today,
      historyAware: true,
      noDataMessage: `No published closes were found for the end of ${year}`,
    });
  }

  return { getCurrentPrices, getYearEndPrices };
}
