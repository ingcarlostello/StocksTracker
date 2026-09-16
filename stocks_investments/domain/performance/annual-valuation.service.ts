import { possibleValuationDates, previousWeekday } from "../market-data/trading-date.service";
import { openPositions } from "../portfolio/portfolio.service";
import { buildPositions, openTickersAt } from "../portfolio/position.service";
import type { TransactionLike } from "../transactions/transaction.type";
import { isoYearEnd, yearOfIsoDate } from "../../utils/date.utils";
import type { AnnualValuationPlan, BoundarySpec, PerformanceYearKind } from "./performance.type";

// Years the selector can offer: the current year down to the year of the earliest trade, contiguous, so a
// year with holdings but no trades is kept (it has a starting and an ending value). A future-dated row —
// only possible from outside the app — is clamped to the current year, never used as the range's floor.
export function performanceYears(
  transactions: readonly TransactionLike[],
  currentYear: number,
): number[] {
  if (transactions.length === 0) return [];

  const firstYear = transactions.reduce(
    (earliest, transaction) => Math.min(earliest, yearOfIsoDate(transaction.date)),
    Number.POSITIVE_INFINITY,
  );
  const from = Math.min(firstYear, currentYear);

  const years: number[] = [];
  for (let year = currentYear; year >= from; year -= 1) years.push(year);
  return years;
}

function boundarySpec(year: number, date: string, symbols: string[]): BoundarySpec {
  return symbols.length === 0
    ? { kind: "no-positions", date }
    : { kind: "year-end-closes", year, symbols };
}

// Tickers the current year's ending value can possibly need. The server answers with one of its own
// candidate dates, so every ticker held on any date it could return is requested: a proved superset of the
// set held at the answer, not a "traded recently" guess. Tickers open now are always included, which keeps
// the cache key equal to the dashboard's whenever nothing was closed out inside the window.
function currentValuationSymbols(
  transactions: readonly TransactionLike[],
  today: string,
): string[] {
  const symbols = new Set(
    openPositions(buildPositions(transactions)).map((position) => position.ticker),
  );
  for (const date of possibleValuationDates(today)) {
    for (const ticker of openTickersAt(transactions, date)) symbols.add(ticker);
  }
  return [...symbols].sort();
}

// Which boundaries a year needs and which tickers each one must price. No price is known here.
export function planAnnualValuation(
  transactions: readonly TransactionLike[],
  year: number,
  today: string,
): AnnualValuationPlan {
  const kind: PerformanceYearKind = year >= yearOfIsoDate(today) ? "current" : "past";
  const positionsBeginDate = isoYearEnd(year - 1);
  const begin = boundarySpec(
    year - 1,
    positionsBeginDate,
    openTickersAt(transactions, positionsBeginDate),
  );

  if (kind === "past") {
    const positionsEndDate = isoYearEnd(year);
    return {
      year,
      kind,
      positionsBeginDate,
      positionsEndDate,
      begin,
      end: boundarySpec(year, positionsEndDate, openTickersAt(transactions, positionsEndDate)),
    };
  }

  // The real valuation date arrives with the response; this one only stands in while nothing is held.
  const fallbackDate = previousWeekday(today);
  const symbols = currentValuationSymbols(transactions, today);
  return {
    year,
    kind,
    positionsBeginDate,
    positionsEndDate: null,
    begin,
    end:
      symbols.length === 0
        ? { kind: "no-positions", date: fallbackDate }
        : { kind: "current-closes", symbols, fallbackDate },
  };
}
