import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { ALL_PORTFOLIOS_SCOPE } from "@/features/portfolio/active-portfolio.constants";
import { useActivePortfolio } from "@/features/portfolio/hooks/use-active-portfolio.hook";
import type { PortfolioOption, PortfolioScope } from "@/features/portfolio/portfolio-selection.type";
import { useTransactions } from "./use-transactions.hook";

type EditTransactionData =
  | { status: "loading" }
  | {
      status: "ready";
      history: TransactionLike<Id<"transactions">>[];
      portfolios: PortfolioOption[];
      // The list the user came from, used to warn when an edit moves the trade out of it.
      scope: PortfolioScope;
    };

// Every portfolio's history: the trade may move to another portfolio, and the pre-checks replay both positions.
// A malformed or unknown id is simply not found in it, so nothing invalid is ever sent to Convex.
export function useEditTransactionData(): EditTransactionData {
  const activePortfolio = useActivePortfolio();
  const { transactions } = useTransactions(ALL_PORTFOLIOS_SCOPE);

  if (activePortfolio.status === "loading" || transactions === undefined) return { status: "loading" };
  return {
    status: "ready",
    history: transactions,
    portfolios: activePortfolio.portfolios,
    scope: activePortfolio.scope,
  };
}
