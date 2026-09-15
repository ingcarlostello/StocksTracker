import type { Holding, PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import type { OversellViolation } from "@/domain/transactions/transaction.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import type { ActivePortfolio } from "./portfolio-selection.type";

export type PortfolioState =
  | { status: "loading" }
  // Nothing to show until the user creates a portfolio.
  | { status: "no-portfolios" }
  // Stored history sells more than it holds (e.g. edited outside the app); totals cannot be trusted.
  | { status: "invalid-history"; violation: OversellViolation }
  | { status: "ready"; active: ActivePortfolio; holdings: Holding[]; summary: PortfolioSummary; prices: PricesState };
