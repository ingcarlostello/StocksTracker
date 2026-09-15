import { compareTransactions } from "@/domain/transactions/transaction-order.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { TRANSACTION_COLUMN_LABELS } from "@/features/transactions/transaction-list.constants";
import { toTransactionRows } from "@/features/transactions/transaction-list.utils";
import { sortedTableCaption } from "@/utils/sort.utils";
import type { RecentTransactionRow, RecentTransactionRowOptions } from "./dashboard.type";

type Orderable = Pick<TransactionLike, "id" | "date" | "createdAt">;

// Newest first = reversed canonical order: later trade date, then later entry (createdAt), then greater id
// (UTF-16 string order). "Newest" is by trade date: a back-dated trade entered today is not recent when 3
// later-dated trades exist, same as /transactions' default sort. Does not rely on input order, never mutates,
// limit ≤ 0 → []. Does not filter: the input is already scoped by the Convex query.
export function selectRecentTransactions<T extends Orderable>(transactions: readonly T[], limit: number): T[] {
  if (limit <= 0) return [];
  return [...transactions].sort((a, b) => compareTransactions(b, a)).slice(0, limit);
}

// Same labels as /transactions (toTransactionRows), keeping only the rendered keys; keeps input order.
// portfolioName: null when the column is hidden; UNKNOWN_PORTFOLIO_NAME ("—") for a portfolio not loaded.
export function toRecentTransactionRows(
  transactions: readonly TransactionLike[],
  options: RecentTransactionRowOptions,
): RecentTransactionRow[] {
  return toTransactionRows(transactions, { ...options, listQueryString: "" }).map(
    ({ id, type, dateLabel, ticker, portfolioName, sharesLabel, priceLabel, totalLabel }) => ({
      id,
      type,
      dateLabel,
      ticker,
      portfolioName,
      sharesLabel,
      priceLabel,
      totalLabel,
    }),
  );
}

// "Recent transactions in all portfolios, sorted by Date descending" (the shared table caption template).
export function recentTransactionsCaption(scopeLabel: string): string {
  return sortedTableCaption("Recent transactions", scopeLabel, TRANSACTION_COLUMN_LABELS.date, "desc");
}
