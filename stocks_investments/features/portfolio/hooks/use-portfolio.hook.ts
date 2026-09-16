import { useMemo } from "react";
import { buildHoldings, openPositions, summarizePortfolio } from "@/domain/portfolio/portfolio.service";
import type { Position } from "@/domain/portfolio/portfolio.type";
import { usePrices } from "@/features/market-data/hooks/use-prices.hook";
import type { PortfolioState } from "../portfolio-state.type";
import { usePortfolioHistory } from "./use-portfolio-history.hook";

const NO_POSITIONS: Position[] = [];

// Holdings of the portfolio chosen in the sidebar; "All portfolios" adds up each portfolio's positions.
export function usePortfolio(): PortfolioState {
  const history = usePortfolioHistory();
  const positions = history.status === "ready" ? history.positions : NO_POSITIONS;
  const tickers = useMemo(() => openPositions(positions).map((position) => position.ticker), [positions]);

  // Called unconditionally (rules of hooks); an empty ticker list keeps the price query disabled.
  const prices = usePrices(tickers);

  const holdings = useMemo(() => buildHoldings(positions, prices.prices), [positions, prices.prices]);
  const summary = useMemo(() => summarizePortfolio(holdings), [holdings]);

  if (history.status !== "ready") return history;
  return {
    status: "ready",
    active: history.active,
    transactions: history.transactions,
    portfolios: history.portfolios,
    holdings,
    summary,
    prices,
  };
}
