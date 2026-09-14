import type { Id } from "@/convex/_generated/dataModel";
import type { PortfolioLike } from "@/domain/portfolio/portfolio.type";

export type PortfolioOption = PortfolioLike<Id<"portfolios">>;

// Which transactions a screen reads: every portfolio, or a single one.
export type PortfolioScope = { kind: "all" } | { kind: "portfolio"; portfolioId: Id<"portfolios"> };

export type ActivePortfolio = { kind: "all" } | { kind: "portfolio"; portfolio: PortfolioOption };

export type ActivePortfolioState =
  | { status: "loading"; select: (value: string) => void }
  | {
      status: "ready";
      portfolios: PortfolioOption[];
      active: ActivePortfolio;
      scope: PortfolioScope;
      // Value of the selector: ALL_PORTFOLIOS_VALUE or a portfolio id.
      selectedValue: string;
      select: (value: string) => void;
    };
