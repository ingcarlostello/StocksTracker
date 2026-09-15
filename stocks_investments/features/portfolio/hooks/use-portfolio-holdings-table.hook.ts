import type { Holding } from "@/domain/portfolio/portfolio.type";
import { activePortfolioScopeLabel } from "../active-portfolio.utils";
import type { HoldingsTableState } from "../holdings-table.type";
import type { PortfolioState } from "../portfolio-state.type";
import { useHoldingsTable } from "./use-holdings-table.hook";

const NO_HOLDINGS: Holding[] = [];

// The holdings table of a portfolio screen; /portfolio and /dashboard both build it here, so their rows match.
// Called unconditionally (rules of hooks), so the sort survives the loading gap of a scope switch.
export function usePortfolioHoldingsTable(portfolio: PortfolioState): HoldingsTableState {
  const ready = portfolio.status === "ready" ? portfolio : null;
  return useHoldingsTable(ready?.holdings ?? NO_HOLDINGS, ready ? activePortfolioScopeLabel(ready.active) : "");
}
