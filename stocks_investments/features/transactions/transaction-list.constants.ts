import type { SelectOption } from "@/components/ui/select-field";
import type { SortDirection } from "@/types/sort.type";
import { TRANSACTION_TYPE_LABELS } from "./transaction-form.constants";
import type { TransactionListQuery, TransactionSortKey } from "./transaction-list.type";

export const LIST_QUERY_PARAMS: Readonly<Record<keyof TransactionListQuery, string>> = {
  ticker: "ticker",
  type: "type",
  from: "from",
  to: "to",
  sort: "sort",
  dir: "dir",
};

// Serialization order, so equal queries always produce the same URL.
export const LIST_QUERY_KEY_ORDER: readonly (keyof TransactionListQuery)[] = ["ticker", "type", "from", "to", "sort", "dir"];

export const TRANSACTION_SORT_KEYS: readonly TransactionSortKey[] = [
  "date",
  "type",
  "ticker",
  "portfolio",
  "shares",
  "price",
  "total",
];

// Newest and largest first for dates and numbers; alphabetical for text.
export const SORT_DEFAULT_DIRECTION: Readonly<Record<TransactionSortKey, SortDirection>> = {
  date: "desc",
  type: "asc",
  ticker: "asc",
  portfolio: "asc",
  shares: "desc",
  price: "desc",
  total: "desc",
};

export const DEFAULT_LIST_QUERY: TransactionListQuery = {
  ticker: "",
  type: "all",
  from: "",
  to: "",
  sort: "date",
  dir: "desc",
};

// Longest ticker TICKER_REGEX allows: 6 letters, a dot and a 2-letter class.
export const TICKER_FILTER_MAX_LENGTH = 9;

export const TYPE_FILTER_OPTIONS: readonly SelectOption[] = [
  { value: "all", label: "All types" },
  { value: "buy", label: TRANSACTION_TYPE_LABELS.BUY },
  { value: "sell", label: TRANSACTION_TYPE_LABELS.SELL },
];

export const TRANSACTION_COLUMN_LABELS: Readonly<Record<TransactionSortKey, string>> = {
  date: "Date",
  type: "Type",
  ticker: "Ticker",
  portfolio: "Portfolio",
  shares: "Shares",
  price: "Price",
  total: "Total",
};

// Shown when a transaction's portfolio is not among the loaded portfolios.
export const UNKNOWN_PORTFOLIO_NAME = "—";

// The Ticker filter stays mounted, so focus lands there when "Clear filters" removes itself.
export const FILTER_TICKER_ID = "filter-ticker";

export const TRANSACTIONS_RESULTS_ID = "transactions-results";

// Used to decide whether the "⋯" panel fits below its trigger before it is measured.
export const ROW_ACTIONS_PANEL_ESTIMATED_HEIGHT = 96;
