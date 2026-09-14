import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { sortTransactions } from "@/domain/transactions/transaction-order.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { toTransactionLike } from "@/domain/transactions/transaction.utils";
import type { PortfolioScope } from "@/features/portfolio/portfolio-selection.type";

type TransactionsState = {
  // undefined while the first Convex result is loading, or while the scope is not known yet ("skip").
  transactions: TransactionLike<Id<"transactions">>[] | undefined;
  isLoading: boolean;
};

// Reactive: re-renders whenever a transaction in the scope is created, updated or removed.
export function useTransactions(scope: PortfolioScope | "skip"): TransactionsState {
  const documents = useQuery(
    api.transactions.list,
    scope === "skip" ? "skip" : scope.kind === "all" ? {} : { portfolioId: scope.portfolioId },
  );

  const transactions = useMemo(
    () => (documents === undefined ? undefined : sortTransactions(documents.map(toTransactionLike))),
    [documents],
  );

  return { transactions, isLoading: documents === undefined };
}
