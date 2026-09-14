import type { TRANSACTION_ERROR_CODES, TRANSACTION_TYPES } from "./transaction.constants";

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type TransactionErrorCode =
  (typeof TRANSACTION_ERROR_CODES)[keyof typeof TRANSACTION_ERROR_CODES];

export type TransactionErrorData =
  | { code: typeof TRANSACTION_ERROR_CODES.VALIDATION; issues: ValidationIssue[] }
  | { code: typeof TRANSACTION_ERROR_CODES.NOT_FOUND; id: string }
  | ({ code: typeof TRANSACTION_ERROR_CODES.OVERSELL } & OversellViolation);

// First SELL in canonical order that needs more shares than were held at that point.
export type OversellViolation = {
  ticker: string;
  date: string;
  transactionId: string;
  available: number;
  requested: number;
};

export type SellSequenceResult = { ok: true } | { ok: false; violation: OversellViolation };

export type TransactionInput = {
  // Every transaction belongs to exactly one portfolio; positions never mix portfolios.
  portfolioId: string;
  ticker: string;
  type: TransactionType;
  date: string;
  quantity: number;
  price: number;
};

// Generic id keeps the storage id type (e.g. a Convex Id) without importing it here.
export type TransactionLike<TId extends string = string> = TransactionInput & {
  id: TId;
  totalAmount: number;
  createdAt: number;
};

export type TransactionField = keyof TransactionInput;

export type ValidationIssue = {
  field: TransactionField;
  code: TransactionValidationCode;
};

export type TransactionValidationCode =
  | "MISSING_PORTFOLIO"
  // Raised by the server when the id does not match a stored portfolio.
  | "UNKNOWN_PORTFOLIO"
  | "INVALID_TICKER"
  | "INVALID_TYPE"
  | "INVALID_DATE"
  | "FUTURE_DATE"
  | "INVALID_QUANTITY"
  | "INVALID_PRICE";

export type ValidationResult =
  | { ok: true; value: TransactionInput }
  | { ok: false; issues: ValidationIssue[] };
