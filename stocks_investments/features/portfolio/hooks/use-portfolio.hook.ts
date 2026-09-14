import { useMemo } from "react";
import { buildHoldings, openPositions, summarizePortfolio } from "@/domain/portfolio/portfolio.service";
import { tryBuildPositions } from "@/domain/portfolio/position.service";
import type { Position } from "@/domain/portfolio/portfolio.type";
import { usePrices } from "@/features/market-data/hooks/use-prices.hook";
import { useTransactions } from "@/features/transactions/hooks/use-transactions.hook";
import type { PortfolioState } from "../portfolio-state.type";
import { useActivePortfolio } from "./use-active-portfolio.hook";

const NO_POSITIONS: Position[] = [];

// Holdings of the portfolio chosen in the sidebar; "All portfolios" adds up each portfolio's positions.
export function usePortfolio(): PortfolioState {
  const activePortfolio = useActivePortfolio();
  const { transactions } = useTransactions(activePortfolio.status === "ready" ? activePortfolio.scope : "skip");

  const replay = useMemo(
    () => (transactions === undefined ? undefined : tryBuildPositions(transactions)),
    [transactions],
  );
  const positions = replay?.ok ? replay.positions : NO_POSITIONS;
  const tickers = useMemo(() => openPositions(positions).map((position) => position.ticker), [positions]);

  // Called unconditionally (rules of hooks); an empty ticker list keeps the price query disabled.
  const prices = usePrices(tickers);

  const holdings = useMemo(() => buildHoldings(positions, prices.prices), [positions, prices.prices]);
  const summary = useMemo(() => summarizePortfolio(holdings), [holdings]);

  if (activePortfolio.status === "loading" || replay === undefined) return { status: "loading" };
  if (activePortfolio.portfolios.length === 0) return { status: "no-portfolios" };
  if (!replay.ok) return { status: "invalid-history", violation: replay.violation };
  return { status: "ready", holdings, summary, prices };
}
