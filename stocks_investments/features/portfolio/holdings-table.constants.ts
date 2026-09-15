import type { SortDirection } from "@/types/sort.type";
import type { HoldingColumn, HoldingSort, HoldingSortKey } from "./holdings-table.type";

// Text A→Z, numbers largest first (same convention as SORT_DEFAULT_DIRECTION).
export const HOLDING_SORT_DEFAULT_DIRECTION: Readonly<Record<HoldingSortKey, SortDirection>> = {
  ticker: "asc",
  shares: "desc",
  averageCost: "desc",
  currentPrice: "desc",
  marketValue: "desc",
  gainLoss: "desc",
  returnPercentage: "desc",
};

export const HOLDINGS_INITIAL_SORT: HoldingSort = { key: "ticker", dir: "asc" };

// Mockup column order.
export const HOLDING_COLUMNS: readonly HoldingColumn[] = [
  { key: "ticker", align: "start" },
  { key: "shares", align: "end" },
  { key: "averageCost", align: "end" },
  { key: "currentPrice", align: "end" },
  { key: "marketValue", align: "end" },
  { key: "gainLoss", align: "end" },
  { key: "returnPercentage", align: "end", visibleLabel: "%" },
];

// Accessible column names, also used in the caption; each contains its visible text (WCAG 2.5.3).
export const HOLDING_COLUMN_LABELS: Readonly<Record<HoldingSortKey, string>> = {
  ticker: "Ticker",
  shares: "Shares",
  averageCost: "Avg. Cost",
  currentPrice: "Current Price",
  marketValue: "Market Value",
  gainLoss: "Gain / Loss",
  returnPercentage: "Return %",
};

export const HOLDING_ACTION_LABELS = {
  HEADER: "Actions",
  TRIGGER_PREFIX: "Actions for",
  VIEW_TRANSACTIONS: "View transactions",
} as const;
