import type { TransactionLike } from "./transaction.type";

type Orderable = Pick<TransactionLike, "id" | "date" | "createdAt">;

// Canonical order: trade date, then entry time for same-day trades, then id as a stable tiebreak.
export function compareTransactions(a: Orderable, b: Orderable): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

export function sortTransactions<T extends Orderable>(transactions: readonly T[]): T[] {
  return [...transactions].sort(compareTransactions);
}
