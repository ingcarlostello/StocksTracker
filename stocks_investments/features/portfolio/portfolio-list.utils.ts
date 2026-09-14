import type { TransactionLike } from "@/domain/transactions/transaction.type";
import type { PortfolioOption } from "./portfolio-selection.type";

export function countTransactionsByPortfolio(transactions: readonly Pick<TransactionLike, "portfolioId">[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { portfolioId } of transactions) counts.set(portfolioId, (counts.get(portfolioId) ?? 0) + 1);
  return counts;
}

export function portfolioNamesById(portfolios: readonly Pick<PortfolioOption, "id" | "name">[]): ReadonlyMap<string, string> {
  return new Map(portfolios.map((portfolio) => [portfolio.id, portfolio.name]));
}
