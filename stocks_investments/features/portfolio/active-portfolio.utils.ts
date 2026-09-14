import { ALL_PORTFOLIOS_VALUE } from "./active-portfolio.constants";
import type { ActivePortfolio, PortfolioOption, PortfolioScope } from "./portfolio-selection.type";

// A stored id that no longer matches a portfolio (deleted, or from another deployment) falls back to all.
export function resolveActivePortfolio(portfolios: readonly PortfolioOption[], storedValue: string | null): ActivePortfolio {
  const portfolio = portfolios.find((candidate) => candidate.id === storedValue);
  return portfolio ? { kind: "portfolio", portfolio } : { kind: "all" };
}

export function scopeOfActivePortfolio(active: ActivePortfolio): PortfolioScope {
  return active.kind === "all" ? { kind: "all" } : { kind: "portfolio", portfolioId: active.portfolio.id };
}

export function activePortfolioValue(active: ActivePortfolio): string {
  return active.kind === "all" ? ALL_PORTFOLIOS_VALUE : active.portfolio.id;
}
