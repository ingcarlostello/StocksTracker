import type { TransactionInput, TransactionLike } from "@/domain/transactions/transaction.type";

// What the user was doing when a SELL was left short, with the data needed to explain it.
export type OversellContext =
  // history is undefined while the list is still loading (only the server can have reported it then).
  | { action: "create"; candidate: TransactionInput; history: readonly TransactionLike[] | undefined }
  | { action: "update"; original: TransactionLike; edited: TransactionInput; history: readonly TransactionLike[] }
  | { action: "remove"; target: TransactionLike };

export type OversellAction = OversellContext["action"];

// Whether the short SELL is the one being saved or another sale already stored.
export type OversellSubject = "this-sale" | "saved-sale";
