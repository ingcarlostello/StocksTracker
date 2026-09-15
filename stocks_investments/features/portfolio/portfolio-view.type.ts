import type { PricesState } from "@/features/market-data/prices-state.type";
import type { HoldingsTableState } from "./holdings-table.type";
import type { PortfolioTotalsModel } from "./portfolio-totals.type";

// What the /portfolio page renders; "empty" covers both "never traded" and "every position sold".
export type PortfolioViewState =
  | { status: "loading" }
  | { status: "no-portfolios" }
  | { status: "invalid-history"; message: string }
  | { status: "empty" }
  | { status: "ready"; prices: PricesState; table: HoldingsTableState; totals: PortfolioTotalsModel };
