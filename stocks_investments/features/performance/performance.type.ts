import type { SelectOption } from "@/components/ui/select-field";
import type {
  AnnualPerformance,
  AnnualValuationPlan,
  BoundarySpec,
} from "@/domain/performance/performance.type";
import type { PriceMap } from "@/domain/portfolio/portfolio.type";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import type { PortfolioHistoryState } from "@/features/portfolio/portfolio-history.type";
import type { BlockedPortfolioViewState } from "@/features/portfolio/portfolio-view.type";
import type { SignedCell } from "@/types/display-sign.type";
import type { PricesResponse } from "@/types/prices-response.type";

// The slice of a TanStack result a boundary reads, so the resolver stays pure and React-free.
export type BoundaryQueryResult = {
  data: PricesResponse | undefined;
  error: Error | null;
  isPending: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
};

export type BoundaryState =
  // Nothing was held: worth 0, and the query is never enabled.
  | { kind: "no-positions"; date: string }
  | { kind: "loading" }
  | { kind: "ready"; asOfDate: string; prices: PriceMap }
  // The provider's history no longer reaches that date; the year says so instead of failing.
  | { kind: "unavailable"; date: string }
  | { kind: "error"; message: string; isRateLimited: boolean };

// A boundary that can be valued. Loading and error block the whole year, so they never reach the domain.
export type SettledBoundaryState = Exclude<BoundaryState, { kind: "loading" } | { kind: "error" }>;

export type AnnualPerformanceResolution =
  | { kind: "loading" }
  | { kind: "error"; message: string; isRateLimited: boolean }
  | { kind: "ready"; performance: AnnualPerformance };

export type AnnualPerformanceState =
  | { kind: "loading" }
  | {
      kind: "error";
      message: string;
      // false while the failed boundary is fetching again or a rate-limit cooldown is running.
      canRetry: boolean;
      // A 429 whose Retry-After has not elapsed yet.
      isRateLimited: boolean;
      retry: () => void;
    }
  | { kind: "ready"; performance: AnnualPerformance };

export type AnnualPerformanceArgs = {
  // [] while the history is loading or blocked.
  transactions: readonly TransactionLike[];
  // null while no year is resolvable (no transactions in this scope).
  year: number | null;
  today: string;
};

// useQueries always receives exactly two slots, so the hook's call order never changes.
export type BoundarySpecPair = [BoundarySpec, BoundarySpec];

// Which end of the period a slot values; it also keeps the two slots' query keys apart.
export type BoundarySide = "begin" | "end";

// Idle means "nothing to measure": no domain call is made and both slots stay disabled.
export type AnnualPerformanceRequest =
  | { idle: true; specs: BoundarySpecPair }
  | { idle: false; plan: AnnualValuationPlan; specs: BoundarySpecPair };

export type PerformanceCardsModel = {
  totalReturn: { label: string; value: SignedCell; caption: string };
  cashContributed: { label: string; valueLabel: string };
  investmentPerformance: { label: string; value: SignedCell; caption: string };
};

// sign "zero" ⇒ a neutral amount; sign null ⇒ muted NOT_AVAILABLE_LABEL.
export type PerformanceSummaryRow = { label: string; value: SignedCell };

export type PerformanceSummaryModel = {
  title: string;
  // "Jan 1, 2025 – Dec 31, 2025 · Pension"
  periodLabel: string;
  // "measured from your first trade of the year · in progress"; null when the period is the plain year.
  periodNote: string | null;
  // "Valued at the closes of Dec 30, 2024 and Dec 31, 2025."; null when no close was used.
  valuationLabel: string | null;
  rows: PerformanceSummaryRow[];
  footnote: string;
};

export type PerformanceYearSelectModel = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};
// Deliberately no `disabled`: a rate limit is gated on the boundary that needs a fetch, never on the
// selector, because a year already in the cache costs no request at all.

export type PerformanceContent =
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string; canRetry: boolean; onRetry: () => void; cooldownMessage: string | null }
  | { kind: "ready"; cards: PerformanceCardsModel; summary: PerformanceSummaryModel; notes: string[] };

export type PerformanceViewState =
  // Same loading / no-portfolios / invalid-history states and messages as /portfolio and /dashboard.
  | BlockedPortfolioViewState
  // No transactions in this scope, so no year can be measured.
  | { status: "empty" }
  | { status: "ready"; year: PerformanceYearSelectModel; announcement: string; content: PerformanceContent };

export type PerformanceViewInput = {
  history: PortfolioHistoryState;
  years: number[];
  selectedYear: number | null;
  onSelectYear: (value: string) => void;
  annual: AnnualPerformanceState;
  // activePortfolioScopeLabel(active); "" outside the ready history, where it is never read.
  scopeLabel: string;
};
