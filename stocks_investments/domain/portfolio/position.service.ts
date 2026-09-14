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

function compareTickers(a: Position, b: Position): number {
  return a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0;
}

// Portfolio ids and tickers never contain a NUL character, so the pair maps to one key.
function positionKey(transaction: Pick<TransactionLike, "portfolioId" | "ticker">): string {
  return `${transaction.portfolioId}\u0000${transaction.ticker}`;
}

// Adds up same-ticker positions held in different portfolios; positions come back sorted by ticker.
// Summing is exact under average cost: the combined average is total basis ÷ total shares.
export function combinePositions(positions: readonly Position[]): Position[] {
  const combined = new Map<string, Position>();

  for (const position of positions) {
    const current = combined.get(position.ticker);
    combined.set(
      position.ticker,
      current === undefined
        ? { ...position }
        : {
            ticker: position.ticker,
            shares: current.shares + position.shares,
            costBasis: current.costBasis + position.costBasis,
            realizedGain: current.realizedGain + position.realizedGain,
          },
    );
  }

  return [...combined.values()].sort(compareTickers);
}

// Replays each (portfolio, ticker) pair in canonical order, so average cost and oversell checks never
// borrow shares from another portfolio; then combines same-ticker positions across portfolios.
// Throws OversellError at the first SELL, in canonical order, that needs more shares than its portfolio held.
export function buildPositions(transactions: readonly TransactionLike[]): Position[] {
  const positions = new Map<string, Position>();

  for (const transaction of sortTransactions(transactions)) {
    const key = positionKey(transaction);
    const current = positions.get(key) ?? emptyPosition(transaction.ticker);
    positions.set(key, applyTransaction(current, transaction));
  }

  return combinePositions([...positions.values()]);
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

// Replays one (portfolio, ticker) position exactly like the server's assertNoOversell: exact id and ticker match.
function findPositionOversell(
  transactions: readonly TransactionLike[],
  portfolioId: string,
  ticker: string,
): OversellViolation | null {
  const position = transactions.filter(
    (transaction) => transaction.portfolioId === portfolioId && transaction.ticker === ticker,
  );
  const result = validateSellSequence(position);
  return result.ok ? null : result.violation;
}

// Client pre-check for a transaction about to be created, mirroring the server: only a SELL can oversell,
// only its own portfolio and ticker are replayed,
// and the server stamps createdAt at insert time, so the candidate sorts after every stored same-day trade.
export function findCandidateOversell(
  history: readonly TransactionLike[],
  candidate: TransactionInput,
): OversellViolation | null {
  if (candidate.type !== "SELL") return null;
  const candidateTransaction: TransactionLike = {
    ...candidate,
    id: CANDIDATE_TRANSACTION_ID,
    totalAmount: calculateTotalAmount(candidate.quantity, candidate.price),
    createdAt: Number.MAX_SAFE_INTEGER,
  };
  return findPositionOversell([...history, candidateTransaction], candidate.portfolioId, candidate.ticker);
}

// Client pre-check for an edit, mirroring the server's update step for step. `edited` must be the validated
// input and `original` the live stored doc: the patch keeps its id and createdAt, so its same-day order holds.
// The new position is checked first (for a BUY too), then the position the trade left, if it moved.
export function findUpdateOversell(
  history: readonly TransactionLike[],
  original: TransactionLike,
  edited: TransactionInput,
): OversellViolation | null {
  const replacement: TransactionLike = {
    ...edited,
    id: original.id,
    createdAt: original.createdAt,
    totalAmount: calculateTotalAmount(edited.quantity, edited.price),
  };
  const next = [...history.filter((transaction) => transaction.id !== original.id), replacement];

  const violation = findPositionOversell(next, edited.portfolioId, edited.ticker);
  if (violation) return violation;
  if (original.portfolioId !== edited.portfolioId || original.ticker !== edited.ticker) {
    return findPositionOversell(next, original.portfolioId, original.ticker);
  }
  return null;
}

// Client pre-check for a delete, mirroring the server's remove: removing a SELL only adds back shares,
// so it is never blocked (and is always the way out of an invalid history).
export function findRemovalOversell(
  history: readonly TransactionLike[],
  target: TransactionLike,
): OversellViolation | null {
  if (target.type === "SELL") return null;
  return findPositionOversell(
    history.filter((transaction) => transaction.id !== target.id),
    target.portfolioId,
    target.ticker,
  );
}
