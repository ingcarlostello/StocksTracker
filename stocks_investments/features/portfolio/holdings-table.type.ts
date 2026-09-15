import type { Holding } from "@/domain/portfolio/portfolio.type";
import type { SignedCell } from "@/types/display-sign.type";
import type { SortState } from "@/types/sort.type";

// Extract ties the keys to Holding: renaming a field breaks compilation.
export type HoldingSortKey = Extract<
  keyof Holding,
  "ticker" | "shares" | "averageCost" | "currentPrice" | "marketValue" | "gainLoss" | "returnPercentage"
>;

export type HoldingSort = SortState<HoldingSortKey>;

export type HoldingColumn = {
  key: HoldingSortKey;
  align: "start" | "end";
  // Visible header when shorter than the accessible name (the mockup's "%").
  visibleLabel?: string;
};

// Pre-formatted row: the table only renders these.
export type HoldingRow = {
  ticker: string;
  sharesLabel: string;
  averageCostLabel: string;
  // false → price, market value, gain and % are NOT_AVAILABLE_LABEL.
  hasPrice: boolean;
  currentPriceLabel: string;
  marketValueLabel: string;
  gainLoss: SignedCell;
  returnPercentage: SignedCell;
  viewTransactionsHref: string;
  actionsId: string;
  actionsLabel: string;
  viewTransactionsLabel: string;
};

export type HoldingsTableState = {
  rows: HoldingRow[];
  sort: HoldingSort;
  caption: string;
  toggleSort: (key: HoldingSortKey) => void;
};
