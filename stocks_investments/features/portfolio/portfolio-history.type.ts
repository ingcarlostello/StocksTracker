import type { Id } from "@/convex/_generated/dataModel";
import type { Position } from "@/domain/portfolio/portfolio.type";
import type { OversellViolation, TransactionLike } from "@/domain/transactions/transaction.type";
import type { ActivePortfolio, PortfolioOption } from "./portfolio-selection.type";

// The priced screens share this much: the scope's history and its replayed positions, without any price.
export type PortfolioHistoryState =
  | { status: "loading" }
  // Nothing to show until the user creates a portfolio.
  | { status: "no-portfolios" }
  // Stored history sells more than it holds (e.g. edited outside the app); positions cannot be trusted.
  | { status: "invalid-history"; violation: OversellViolation }
  | {
      status: "ready";
      active: ActivePortfolio;
      // Every portfolio (creation order), e.g. to name each transaction's portfolio in "All portfolios".
      portfolios: PortfolioOption[];
      // The scope's transactions in canonical ascending order, the same array the positions were replayed from.
      transactions: TransactionLike<Id<"transactions">>[];
      positions: Position[];
    };
