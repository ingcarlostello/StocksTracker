import type { PriceMap } from "../portfolio/portfolio.type";
import type { TransactionLike } from "../transactions/transaction.type";
import type { ANNUAL_PERFORMANCE_STATUSES } from "./performance.constants";

// BUY = external contribution (+totalAmount), SELL = external withdrawal (−totalAmount). No cash account.
export type CashFlow = { date: string; amount: number };

export type CashFlowSummary = { contributions: number; withdrawals: number; net: number };

export type ExcludedFlows = { count: number; firstDate: string | null; net: number };

export type ModifiedDietzInput = {
  beginValue: number;
  endValue: number;
  flows: readonly CashFlow[];
  // Inclusive "YYYY-MM-DD".
  start: string;
  // Exclusive "YYYY-MM-DD".
  endExclusive: string;
};

export type ModifiedDietzResult =
  | { ok: true; rate: number; averageCapital: number }
  | { ok: false; reason: "NON_POSITIVE_AVERAGE_CAPITAL"; averageCapital: number };

export type PerformanceYearKind = "past" | "current";

// What a boundary needs from the price layer, decided before any price is known.
export type BoundarySpec =
  // Nothing was held: the value is 0 and no request is made.
  | { kind: "no-positions"; date: string }
  | { kind: "year-end-closes"; year: number; symbols: string[] }
  | { kind: "current-closes"; symbols: string[]; fallbackDate: string };

export type AnnualValuationPlan = {
  year: number;
  kind: PerformanceYearKind;
  // `${year - 1}-12-31`.
  positionsBeginDate: string;
  // Past: `${year}-12-31`; current: null, because it comes from the price response.
  positionsEndDate: string | null;
  begin: BoundarySpec;
  end: BoundarySpec;
};

// What a boundary resolved to, once its query settled.
export type BoundaryValuation =
  | { kind: "no-positions"; date: string }
  | { kind: "closes"; asOfDate: string; prices: PriceMap }
  | { kind: "unavailable"; date: string };

export type AnnualPerformanceInput = {
  transactions: readonly TransactionLike[];
  year: number;
  kind: PerformanceYearKind;
  begin: BoundaryValuation;
  end: BoundaryValuation;
};

export type AnnualPerformanceStatus = (typeof ANNUAL_PERFORMANCE_STATUSES)[number];

export type PerformancePeriod = {
  // Jan 1, or the first flow of the year when nothing was held on Jan 1.
  start: string;
  // Jan 1 of year + 1, or the valuation date + 1, or the last flow + 1 when isClosedOut.
  endExclusive: string;
  // endExclusive − 1 day; null only for the zero-length awaiting-first-close period.
  lastDay: string | null;
  // CD of the formula; >= 1 whenever modifiedDietz is called.
  calendarDays: number;
  isRebasedStart: boolean;
  isInProgress: boolean;
  // Nothing held at the valuation date and the year had flows, so the period ends at the last flow.
  // Independent of isRebasedStart; both can be true (first flow → last flow).
  isClosedOut: boolean;
};

export type AnnualPerformance = {
  year: number;
  kind: PerformanceYearKind;
  status: AnnualPerformanceStatus;
  period: PerformancePeriod;
  // The close date actually used; null when none was needed or available.
  beginValuationDate: string | null;
  endValuationDate: string | null;
  // null ⇔ a boundary close is missing or unavailable.
  beginValue: number | null;
  endValue: number | null;
  // Σ BUY totalAmount (>= 0).
  contributions: number;
  // Σ SELL totalAmount (>= 0).
  withdrawals: number;
  // contributions − withdrawals; negative for a net seller.
  cashContributed: number;
  // EV − BV − cashContributed.
  investmentPerformance: number | null;
  // Ratio (0.1494 = 14.94%), never annualised.
  totalReturn: number | null;
  // Dietz denominator, kept for the explanation text.
  averageCapital: number | null;
  missingBeginTickers: string[];
  missingEndTickers: string[];
  // The boundary's closes are outside the provider's history window.
  beginUnavailable: boolean;
  endUnavailable: boolean;
  // Year-N trades dated after the valuation date.
  excludedFlows: ExcludedFlows;
};
