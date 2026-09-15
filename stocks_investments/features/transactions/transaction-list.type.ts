import type { TransactionType } from "@/domain/transactions/transaction.type";
import type { SortDirection, SortState } from "@/types/sort.type";

export type TransactionTypeFilter = "all" | "buy" | "sell";

export type TransactionSortKey = "date" | "type" | "ticker" | "portfolio" | "shares" | "price" | "total";

// Filters and sort saved in the URL. In the draft `ticker` is raw text; in a parsed or applied query it is normalized.
export type TransactionListQuery = {
  ticker: string;
  type: TransactionTypeFilter;
  // ISO dates, or "" for no bound.
  from: string;
  to: string;
  sort: TransactionSortKey;
  dir: SortDirection;
};

// The sort actually applied, e.g. date while a portfolio sort is saved but its column is hidden.
export type EffectiveSort = SortState<TransactionSortKey>;

// URL queries seen and written by the list, so a delayed commit of an older write never rolls the draft back.
export type UrlSyncState = { seenUrl: string; pendingWrites: readonly string[] };

export type UrlSyncResult = { kind: "unchanged" } | { kind: "own-write"; pendingWrites: string[] } | { kind: "external" };

// Pre-formatted table row: the table only renders these labels.
export type TransactionRow = {
  id: string;
  type: TransactionType;
  dateLabel: string;
  ticker: string;
  // null while the Portfolio column is hidden.
  portfolioName: string | null;
  sharesLabel: string;
  priceLabel: string;
  totalLabel: string;
  // Accessible name of the row, e.g. "Buy 10.0000 AAPL on Nov 10, 2024".
  description: string;
  editHref: string;
  actionsId: string;
};

export type TransactionSummary = {
  type: TransactionType;
  ticker: string;
  sharesLabel: string;
  priceLabel: string;
  totalLabel: string;
  dateLabel: string;
  portfolioName: string;
};

export type DeleteDialogModel =
  | { kind: "confirm"; summary: TransactionSummary; error: string | null; returnFocusId: string }
  | { kind: "deleting"; summary: TransactionSummary; returnFocusId: string }
  | { kind: "blocked"; summary: TransactionSummary; message: string; saleEditHref: string; returnFocusId: string }
  | { kind: "missing"; returnFocusId: string };
