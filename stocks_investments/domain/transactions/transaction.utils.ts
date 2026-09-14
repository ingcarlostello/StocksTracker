import type { TransactionLike } from "./transaction.type";

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
