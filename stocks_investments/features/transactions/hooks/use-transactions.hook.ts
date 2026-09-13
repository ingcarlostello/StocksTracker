import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { sortTransactions } from "@/domain/transactions/transaction-order.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { toTransactionLike } from "@/domain/transactions/transaction.utils";
import type { Id } from "@/convex/_generated/dataModel";

type TransactionsState = {
  // undefined while the first Convex result is loading.
  transactions: TransactionLike<Id<"transactions">>[] | undefined;
  isLoading: boolean;
};

// Reactive: re-renders whenever a transaction is created, updated or removed.
export function useTransactions(): TransactionsState {
  const documents = useQuery(api.transactions.list);

  const transactions = useMemo(
    () => (documents === undefined ? undefined : sortTransactions(documents.map(toTransactionLike))),
    [documents],
  );

  return { transactions, isLoading: documents === undefined };
}
