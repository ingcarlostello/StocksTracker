import type { TransactionLike } from "@/domain/transactions/transaction.type";

export function countTransactionsByPortfolio(transactions: readonly Pick<TransactionLike, "portfolioId">[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { portfolioId } of transactions) counts.set(portfolioId, (counts.get(portfolioId) ?? 0) + 1);
  return counts;
}
