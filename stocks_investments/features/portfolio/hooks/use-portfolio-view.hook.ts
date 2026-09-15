import type { Holding } from "@/domain/portfolio/portfolio.type";
import { activePortfolioScopeLabel } from "../active-portfolio.utils";
import { toPortfolioTotals } from "../portfolio-totals.utils";
import type { PortfolioViewState } from "../portfolio-view.type";
import { invalidHistoryMessage } from "../portfolio-view.utils";
import { useHoldingsTable } from "./use-holdings-table.hook";
import { usePortfolio } from "./use-portfolio.hook";

const NO_HOLDINGS: Holding[] = [];

// Everything the /portfolio page renders: holdings table, totals card and the non-ready states.
export function usePortfolioView(): PortfolioViewState {
  const portfolio = usePortfolio();
  const ready = portfolio.status === "ready" ? portfolio : null;
  // Called unconditionally (rules of hooks), so the sort survives the loading gap of a scope switch.
  const table = useHoldingsTable(ready?.holdings ?? NO_HOLDINGS, ready ? activePortfolioScopeLabel(ready.active) : "");

  if (portfolio.status === "loading") return { status: "loading" };
  if (portfolio.status === "no-portfolios") return { status: "no-portfolios" };
  if (portfolio.status === "invalid-history") {
    return { status: "invalid-history", message: invalidHistoryMessage(portfolio.violation) };
  }
  if (portfolio.holdings.length === 0) return { status: "empty" };
  return {
    status: "ready",
    prices: portfolio.prices,
    table,
    totals: toPortfolioTotals(portfolio.summary, portfolio.prices),
  };
}
