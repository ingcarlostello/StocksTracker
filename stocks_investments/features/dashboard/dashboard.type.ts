import type { TransactionLike } from "@/domain/transactions/transaction.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import type { HoldingsTableState } from "@/features/portfolio/holdings-table.type";
import type { PortfolioState } from "@/features/portfolio/portfolio-state.type";
import type { BlockedPortfolioViewState } from "@/features/portfolio/portfolio-view.type";
import type { TransactionCellsRow, TransactionRow } from "@/features/transactions/transaction-list.type";
import type { SignedCell } from "@/types/display-sign.type";

// Pre-formatted stat cards; labels come from toPortfolioTotals, so they equal /portfolio's totals.
export type SummaryCardsModel = {
  // label is NOT_AVAILABLE_LABEL and isAvailable false while any holding has no price.
  portfolioValue: { label: string; isAvailable: boolean };
  totalInvestedLabel: string;
  // Unrealized only; amount only (no % line).
  totalGainLoss: SignedCell;
  // Signed ratio as a percent; { "—", null } when unpriced or nothing is invested.
  portfolioReturn: SignedCell;
  // Why values are withheld; null when complete.
  note: string | null;
};

// The /transactions row without its edit link, actions id and description: the rendered cells plus the React key.
export type RecentTransactionRow = TransactionCellsRow & Pick<TransactionRow, "id">;

export type RecentTransactionRowOptions = {
  // true only in "All portfolios".
  showPortfolioColumn: boolean;
  portfolioNames: ReadonlyMap<string, string>;
};

export type RecentTransactionsModel = {
  // Newest first, at most RECENT_TRANSACTIONS_LIMIT; [] → "No transactions yet."
  rows: RecentTransactionRow[];
  showPortfolioColumn: boolean;
  caption: string;
  // ROUTES.TRANSACTIONS: unfiltered list in its default (date desc) order.
  viewAllHref: string;
};

export type DashboardViewInput = {
  portfolio: PortfolioState;
  // From usePortfolioHoldingsTable (shared with /portfolio); passed through by reference when holdings exist.
  table: HoldingsTableState;
  // selectRecentTransactions(ready.transactions, RECENT_TRANSACTIONS_LIMIT); [] outside ready.
  recentTransactions: readonly TransactionLike[];
};

export type DashboardState =
  // Same non-ready states and messages as /portfolio (blockedPortfolioView).
  | BlockedPortfolioViewState
  | {
      status: "ready";
      // null while nothing is held: no label, no Refresh (a disabled query can still hold placeholder data).
      prices: PricesState | null;
      // null unless prices !== null and (errorMessage !== null || missing.length > 0).
      priceAlerts: Pick<PricesState, "errorMessage" | "missing"> | null;
      cards: SummaryCardsModel;
      // null → "No holdings yet…" (never traded, or every position sold).
      holdings: HoldingsTableState | null;
      recent: RecentTransactionsModel;
    };
