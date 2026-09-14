import type {
  OversellViolation,
  TransactionField,
  TransactionInput,
  TransactionType,
  ValidationIssue,
} from "@/domain/transactions/transaction.type";

// Shares and amount are linked through the price; the one the user edited last drives the other.
export type PositionSizeField = "quantity" | "amount";

// Raw text as typed; numbers are parsed only when the form is submitted.
export type TransactionFormValues = {
  type: TransactionType;
  ticker: string;
  date: string;
  price: string;
  sizeField: PositionSizeField;
  sizeText: string;
};

// What the Shares and Amount inputs show: the driver as typed, the other one calculated.
export type PositionSizeDisplay = Record<PositionSizeField, string>;

export type TransactionFormField = TransactionField | "amount";

export type TransactionTextField = "ticker" | "date" | "price";

export type TransactionFieldErrors = Partial<Record<TransactionFormField, string>>;

export type TransactionInputResult =
  | { ok: true; input: TransactionInput }
  | { ok: false; fieldErrors: TransactionFieldErrors };

export type TransactionMutationError =
  | { kind: "validation"; issues: ValidationIssue[] }
  | { kind: "oversell"; violation: OversellViolation }
  | { kind: "not-found" }
  | { kind: "unexpected" };

export type TransactionMutationResult<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; error: TransactionMutationError };
