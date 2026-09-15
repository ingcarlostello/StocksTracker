import { toPortfolioTotals } from "../portfolio-totals.utils";
import type { PortfolioViewState } from "../portfolio-view.type";
import { blockedPortfolioView } from "../portfolio-view.utils";
import { usePortfolioHoldingsTable } from "./use-portfolio-holdings-table.hook";
import { usePortfolio } from "./use-portfolio.hook";

// Everything the /portfolio page renders: holdings table, totals card and the non-ready states.
export function usePortfolioView(): PortfolioViewState {
  const portfolio = usePortfolio();
  const table = usePortfolioHoldingsTable(portfolio);

  if (portfolio.status !== "ready") return blockedPortfolioView(portfolio);
  if (portfolio.holdings.length === 0) return { status: "empty" };
  return {
    status: "ready",
    prices: portfolio.prices,
    table,
    totals: toPortfolioTotals(portfolio.summary, portfolio.prices),
  };
}
