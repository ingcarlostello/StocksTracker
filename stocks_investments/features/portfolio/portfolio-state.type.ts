import type { Id } from "@/convex/_generated/dataModel";
import type { Holding, PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import type { OversellViolation, TransactionLike } from "@/domain/transactions/transaction.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import type { ActivePortfolio, PortfolioOption } from "./portfolio-selection.type";

export type PortfolioState =
  | { status: "loading" }
  // Nothing to show until the user creates a portfolio.
  | { status: "no-portfolios" }
  // Stored history sells more than it holds (e.g. edited outside the app); totals cannot be trusted.
  | { status: "invalid-history"; violation: OversellViolation }
  | {
      status: "ready";
      active: ActivePortfolio;
      // Every portfolio (creation order), e.g. to name each transaction's portfolio in "All portfolios".
      portfolios: PortfolioOption[];
      // The scope's transactions in canonical ascending order, the same array the positions were replayed from.
      transactions: TransactionLike<Id<"transactions">>[];
      holdings: Holding[];
      summary: PortfolioSummary;
      prices: PricesState;
    };
