import type { Holding, PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import type { OversellViolation } from "@/domain/transactions/transaction.type";
import type { PricesState } from "@/features/market-data/prices-state.type";

export type PortfolioState =
  | { status: "loading" }
  // Stored history sells more than it holds (e.g. edited outside the app); totals cannot be trusted.
  | { status: "invalid-history"; violation: OversellViolation }
  | { status: "ready"; holdings: Holding[]; summary: PortfolioSummary; prices: PricesState };
