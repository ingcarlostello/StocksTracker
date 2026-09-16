import { queryOptions } from "@tanstack/react-query";
import { buildAnnualPerformance } from "@/domain/performance/annual-performance.service";
import { planAnnualValuation } from "@/domain/performance/annual-valuation.service";
import type {
  AnnualValuationPlan,
  BoundarySpec,
  BoundaryValuation,
} from "@/domain/performance/performance.type";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { PricesApiError } from "@/features/market-data/prices.errors";
import { pricesErrorMessage } from "@/features/market-data/prices-messages.utils";
import { currentPricesQueryOptions, yearEndPricesQueryOptions } from "@/features/market-data/prices.service";
import type { PricesResponse } from "@/types/prices-response.type";
import { isoYearEnd } from "@/utils/date.utils";
import type {
  AnnualPerformanceArgs,
  AnnualPerformanceRequest,
  AnnualPerformanceResolution,
  BoundaryQueryResult,
  BoundarySide,
  BoundarySpecPair,
  BoundaryState,
  SettledBoundaryState,
} from "./performance.type";

const LOADING_RESOLUTION: AnnualPerformanceResolution = { kind: "loading" };

// The date a boundary values, known before any response: the calendar year end, or the valuation date
// that stands in while the real one is unknown.
function specDate(spec: BoundarySpec): string {
  if (spec.kind === "year-end-closes") return isoYearEnd(spec.year);
  if (spec.kind === "current-closes") return spec.fallbackDate;
  return spec.date;
}

// A boundary with nothing to price still occupies its slot, so the query list never changes length. Its key
// carries the side and the date because two disabled slots sharing one key make TanStack report duplicate
// queries — which both idle renders and a year whose two boundaries hold no positions would do permanently.
function noPositionsQueryOptions(side: BoundarySide, date: string) {
  return queryOptions({
    queryKey: ["performance", "no-positions", side, date] as const,
    // Never runs: the slot is disabled. It exists so every slot resolves to the same result type.
    queryFn: (): Promise<PricesResponse> => {
      throw new Error("A boundary with no positions is never fetched");
    },
    enabled: false,
  });
}

// One slot per boundary. A slot alternates between year-end and current options as the year changes, so
// keepPreviousData is dropped: it would hand one year's closes to another year. That override is
// observer-level — neither the key nor the cache entry moves, so /dashboard keeps its own placeholder.
// The return type is inferred: queryOptions() ties queryFn to its own literal key tuple, which no widened
// UseQueryOptions<PricesResponse> annotation can describe (its queryFn would take any QueryKey).
export function boundaryQueryOptions(spec: BoundarySpec, side: BoundarySide) {
  if (spec.kind === "year-end-closes") return yearEndPricesQueryOptions(spec.year, spec.symbols);
  if (spec.kind === "no-positions") return noPositionsQueryOptions(side, spec.date);
  return { ...currentPricesQueryOptions(spec.symbols), placeholderData: undefined };
}

// The two disabled slots of an idle render: no symbols, so no request and no cache entry.
export function idleBoundarySpecs(today: string): BoundarySpecPair {
  return [
    { kind: "no-positions", date: today },
    { kind: "no-positions", date: today },
  ];
}

// The single decision point for "is there anything to measure?", so the hook stays branch-free above
// useQueries: with no year or no history the domain is never called, but the slots still exist.
export function annualPerformanceArgs(args: AnnualPerformanceArgs): AnnualPerformanceRequest {
  const { transactions, year, today } = args;
  if (year === null || transactions.length === 0) return { idle: true, specs: idleBoundarySpecs(today) };

  const plan = planAnnualValuation(transactions, year, today);
  return { idle: false, plan, specs: [plan.begin, plan.end] };
}

export function resolveBoundary(spec: BoundarySpec, result: BoundaryQueryResult): BoundaryState {
  if (spec.kind === "no-positions") return { kind: "no-positions", date: spec.date };

  // A published close is immutable, so closes already in hand outlive a later failed refetch. Placeholder
  // data belongs to another symbol set or another year and must never be read as this boundary's value.
  if (result.data !== undefined && !result.isPlaceholderData) {
    return { kind: "ready", asOfDate: result.data.asOfDate, prices: result.data.prices };
  }

  if (result.error !== null) {
    const code = result.error instanceof PricesApiError ? result.error.code : null;
    // Permanent on this plan: the year explains it instead of offering a retry that cannot succeed.
    if (code === "PRICE_HISTORY_UNAVAILABLE") return { kind: "unavailable", date: specDate(spec) };
    return {
      kind: "error",
      message: pricesErrorMessage(result.error),
      isRateLimited: code === "RATE_LIMITED",
    };
  }

  return { kind: "loading" };
}

// The boundary that blocks the year, in the order resolveAnnualPerformance reports it. Only an "error"
// boundary blocks: a boundary the plan will never serve keeps its rejection but resolves to "unavailable",
// so it is explained instead of retried, and it must not stand in for the failure being shown.
export function blockingBoundarySide(begin: BoundaryState, end: BoundaryState): BoundarySide | null {
  if (begin.kind === "error") return "begin";
  if (end.kind === "error") return "end";
  return null;
}

export function toBoundaryValuation(state: SettledBoundaryState): BoundaryValuation {
  switch (state.kind) {
    case "ready":
      return { kind: "closes", asOfDate: state.asOfDate, prices: state.prices };
    case "unavailable":
      return { kind: "unavailable", date: state.date };
    case "no-positions":
      return { kind: "no-positions", date: state.date };
  }
}

// Loading wins over an error: both slots start together, so a settled failure is reported once nothing
// else is in flight, instead of flashing an error next to a request that is still running.
export function resolveAnnualPerformance(
  plan: AnnualValuationPlan,
  transactions: readonly TransactionLike[],
  begin: BoundaryState,
  end: BoundaryState,
): AnnualPerformanceResolution {
  if (begin.kind === "loading" || end.kind === "loading") return LOADING_RESOLUTION;
  if (begin.kind === "error") {
    return { kind: "error", message: begin.message, isRateLimited: begin.isRateLimited };
  }
  if (end.kind === "error") {
    return { kind: "error", message: end.message, isRateLimited: end.isRateLimited };
  }

  return {
    kind: "ready",
    performance: buildAnnualPerformance({
      transactions,
      year: plan.year,
      kind: plan.kind,
      begin: toBoundaryValuation(begin),
      end: toBoundaryValuation(end),
    }),
  };
}
