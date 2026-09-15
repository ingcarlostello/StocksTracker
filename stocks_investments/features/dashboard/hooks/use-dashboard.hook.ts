import { useMemo } from "react";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { usePortfolioHoldingsTable } from "@/features/portfolio/hooks/use-portfolio-holdings-table.hook";
import { usePortfolio } from "@/features/portfolio/hooks/use-portfolio.hook";
import { RECENT_TRANSACTIONS_LIMIT } from "../dashboard.constants";
import type { DashboardState } from "../dashboard.type";
import { buildDashboardView } from "../dashboard-view.utils";
import { selectRecentTransactions } from "../recent-transactions.utils";

const NO_TRANSACTIONS: TransactionLike[] = [];

// Everything the dashboard renders, for the portfolio chosen in the sidebar.
export function useDashboard(): DashboardState {
  const portfolio = usePortfolio();
  // Same hook as /portfolio (user decision 1): identical rows, caption and initial sort.
  const table = usePortfolioHoldingsTable(portfolio);

  // Dependency is a memoized reference (useTransactions); never portfolio.active, which is a new object every render.
  const transactions = portfolio.status === "ready" ? portfolio.transactions : undefined;
  const recentTransactions = useMemo(
    () =>
      transactions === undefined ? NO_TRANSACTIONS : selectRecentTransactions(transactions, RECENT_TRANSACTIONS_LIMIT),
    [transactions],
  );

  return buildDashboardView({ portfolio, table, recentTransactions });
}
