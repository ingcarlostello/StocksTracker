import { useMemo } from "react";
import { tryBuildPositions } from "@/domain/portfolio/position.service";
import { useTransactions } from "@/features/transactions/hooks/use-transactions.hook";
import type { PortfolioHistoryState } from "../portfolio-history.type";
import { useActivePortfolio } from "./use-active-portfolio.hook";

// Transactions and positions of the portfolio chosen in the sidebar, with no price query attached: a screen
// that prices a different symbol set than "open now" (e.g. /performance) must not mount a second observer.
export function usePortfolioHistory(): PortfolioHistoryState {
  const activePortfolio = useActivePortfolio();
  const { transactions } = useTransactions(activePortfolio.status === "ready" ? activePortfolio.scope : "skip");

  const replay = useMemo(
    () => (transactions === undefined ? undefined : tryBuildPositions(transactions)),
    [transactions],
  );

  // replay is undefined exactly when transactions is; both are checked because TypeScript cannot narrow
  // transactions through the memo.
  if (activePortfolio.status === "loading" || transactions === undefined || replay === undefined) {
    return { status: "loading" };
  }
  if (activePortfolio.portfolios.length === 0) return { status: "no-portfolios" };
  if (!replay.ok) return { status: "invalid-history", violation: replay.violation };
  return {
    status: "ready",
    // Narrowed: the loading status returned above.
    active: activePortfolio.active,
    // Memoized in usePortfolios; used for portfolio names in "All portfolios".
    portfolios: activePortfolio.portfolios,
    // The same memoized array the positions were replayed from (canonical ascending).
    transactions,
    positions: replay.positions,
  };
}
