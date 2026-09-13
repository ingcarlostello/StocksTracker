import { sortTransactions } from "../transactions/transaction-order.service";
import { calculateTotalAmount } from "../transactions/transaction-validation.service";
import type { TransactionLike } from "../transactions/transaction.type";
import type { Position } from "./portfolio.type";

type AppliedTransaction = Pick<TransactionLike, "ticker" | "type" | "quantity" | "price">;

export function emptyPosition(ticker: string): Position {
  return { ticker, shares: 0, costBasis: 0 };
}

export function applyTransaction(position: Position, transaction: AppliedTransaction): Position {
  if (transaction.ticker !== position.ticker) {
    throw new Error(
      `Cannot apply a ${transaction.ticker} transaction to the ${position.ticker} position`,
    );
  }

  switch (transaction.type) {
    case "BUY":
      return {
        ...position,
        shares: position.shares + transaction.quantity,
        costBasis: position.costBasis + calculateTotalAmount(transaction.quantity, transaction.price),
      };
    case "SELL":
      throw new Error("SELL transactions are not supported by the position engine yet");
  }
}

// Replays each ticker's transactions in canonical order; positions come back sorted by ticker.
export function buildPositions(transactions: readonly TransactionLike[]): Position[] {
  const positions = new Map<string, Position>();

  for (const transaction of sortTransactions(transactions)) {
    const current = positions.get(transaction.ticker) ?? emptyPosition(transaction.ticker);
    positions.set(transaction.ticker, applyTransaction(current, transaction));
  }

  return [...positions.values()].sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
}
