import type { TransactionInput, TransactionLike } from "./transaction.type";

type StoredTransaction<TId extends string> = Omit<TransactionLike<TId>, "id"> & { _id: TId };

export function toTransactionLike<TId extends string>({
  _id,
  ...fields
}: StoredTransaction<TId>): TransactionLike<TId> {
  return {
    id: _id,
    portfolioId: fields.portfolioId,
    ticker: fields.ticker,
    type: fields.type,
    date: fields.date,
    quantity: fields.quantity,
    price: fields.price,
    totalAmount: fields.totalAmount,
    createdAt: fields.createdAt,
  };
}

// Exact (===) comparison: a one-ulp quantity change is a change, because it would change the stored total.
export function isSameTransactionInput(a: TransactionInput, b: TransactionInput): boolean {
  return (
    a.portfolioId === b.portfolioId &&
    a.ticker === b.ticker &&
    a.type === b.type &&
    a.date === b.date &&
    a.quantity === b.quantity &&
    a.price === b.price
  );
}

// Every stored field except the id, so an edit elsewhere to any of them is detected.
export function isSameStoredTransaction(a: TransactionLike, b: TransactionLike): boolean {
  return isSameTransactionInput(a, b) && a.totalAmount === b.totalAmount && a.createdAt === b.createdAt;
}
