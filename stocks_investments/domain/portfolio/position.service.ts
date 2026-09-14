import { sortTransactions } from "../transactions/transaction-order.service";
import { calculateTotalAmount } from "../transactions/transaction-validation.service";
import type {
  OversellViolation,
  SellSequenceResult,
  TransactionInput,
  TransactionLike,
} from "../transactions/transaction.type";
import { CANDIDATE_TRANSACTION_ID, SHARES_EPSILON } from "./portfolio.constants";
import { OversellError } from "./position.errors";
import type { Position, PositionsResult } from "./portfolio.type";

type AppliedTransaction = Pick<TransactionLike, "id" | "ticker" | "type" | "date" | "quantity" | "price">;

export function emptyPosition(ticker: string): Position {
  return { ticker, shares: 0, costBasis: 0, realizedGain: 0 };
}

// Selling from a closed position is always an oversell, however small the quantity.
function isOversell(position: Position, quantity: number): boolean {
  return position.shares <= SHARES_EPSILON || quantity > position.shares + SHARES_EPSILON;
}

function closesPosition(position: Position, quantity: number): boolean {
  return position.shares - quantity <= SHARES_EPSILON;
}

// Cost basis removed by selling `quantity` shares at average cost; the average itself does not change.
export function sellCostBasis(position: Position, quantity: number): number {
  if (isOversell(position, quantity)) {
    throw new RangeError(
      `Cannot remove cost for ${quantity} ${position.ticker} shares: only ${position.shares} held`,
    );
  }
  // Selling everything removes the whole basis so no float residue is left behind.
  if (closesPosition(position, quantity)) return position.costBasis;
  return quantity * (position.costBasis / position.shares);
}

export function applyTransaction(position: Position, transaction: AppliedTransaction): Position {
  if (transaction.ticker !== position.ticker) {
    throw new Error(
      `Cannot apply a ${transaction.ticker} transaction to the ${position.ticker} position`,
    );
  }

  const amount = calculateTotalAmount(transaction.quantity, transaction.price);

  switch (transaction.type) {
    case "BUY":
      return {
        ...position,
        shares: position.shares + transaction.quantity,
        costBasis: position.costBasis + amount,
      };
    case "SELL": {
      if (isOversell(position, transaction.quantity)) {
        throw new OversellError({
          ticker: transaction.ticker,
          date: transaction.date,
          transactionId: transaction.id,
          available: position.shares,
          requested: transaction.quantity,
        });
      }
      const basisRemoved = sellCostBasis(position, transaction.quantity);
      const realizedGain = position.realizedGain + (amount - basisRemoved);
      if (closesPosition(position, transaction.quantity)) {
        return { ...position, shares: 0, costBasis: 0, realizedGain };
      }
      return {
        ...position,
        shares: position.shares - transaction.quantity,
        costBasis: position.costBasis - basisRemoved,
        realizedGain,
      };
    }
  }
}

// Replays each ticker in canonical order; positions come back sorted by ticker.
// Throws OversellError when the history sells more than it holds.
export function buildPositions(transactions: readonly TransactionLike[]): Position[] {
  const positions = new Map<string, Position>();

  for (const transaction of sortTransactions(transactions)) {
    const current = positions.get(transaction.ticker) ?? emptyPosition(transaction.ticker);
    positions.set(transaction.ticker, applyTransaction(current, transaction));
  }

  return [...positions.values()].sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
}

// Non-throwing replay for callers that must render an invalid history instead of crashing.
export function tryBuildPositions(transactions: readonly TransactionLike[]): PositionsResult {
  try {
    return { ok: true, positions: buildPositions(transactions) };
  } catch (error) {
    if (error instanceof OversellError) return { ok: false, violation: error.violation };
    throw error;
  }
}

// Non-throwing check of a whole history, for mutations and forms.
export function validateSellSequence(transactions: readonly TransactionLike[]): SellSequenceResult {
  const result = tryBuildPositions(transactions);
  return result.ok ? { ok: true } : result;
}

// Client pre-check for a transaction about to be created, mirroring the server: only a SELL can oversell,
// and the server stamps createdAt at insert time, so the candidate sorts after every stored same-day trade.
export function findCandidateOversell(
  history: readonly TransactionLike[],
  candidate: TransactionInput,
): OversellViolation | null {
  if (candidate.type !== "SELL") return null;
  const tickerHistory = history.filter((transaction) => transaction.ticker === candidate.ticker);
  const candidateTransaction: TransactionLike = {
    ...candidate,
    id: CANDIDATE_TRANSACTION_ID,
    totalAmount: calculateTotalAmount(candidate.quantity, candidate.price),
    createdAt: Number.MAX_SAFE_INTEGER,
  };
  const result = validateSellSequence([...tickerHistory, candidateTransaction]);
  return result.ok ? null : result.violation;
}
