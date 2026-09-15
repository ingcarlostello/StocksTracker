import type { SignedCell, SignedLabel } from "@/types/display-sign.type";

// Pre-formatted "Portfolio Totals" card: the component only renders these.
export type PortfolioTotalsModel = {
  // false while any holding has no price (summary.portfolioValue === null).
  isComplete: boolean;
  marketValueLabel: string;
  totalInvestedLabel: string;
  gainLoss: SignedCell;
  // null → the "+x%" line is not rendered.
  returnPercentage: SignedLabel | null;
  // Why Market Value and Gain are withheld; null when complete.
  note: string | null;
};

// Why value, gain and return are withheld; see withheldTotalsReason.
export type WithheldTotalsReason =
  | { kind: "waiting-for-prices" }
  | { kind: "missing-prices"; tickers: readonly string[] };
