import { ConvexError } from "convex/values";
import { TRANSACTION_ERROR_CODES, TRANSACTION_FIELDS } from "@/domain/transactions/transaction.constants";
import type { OversellViolation, ValidationIssue } from "@/domain/transactions/transaction.type";
import { isRecord } from "@/utils/type-guard.utils";
import { TRANSACTION_VALIDATION_MESSAGES } from "./transaction-messages.constants";
import type { TransactionMutationError } from "./transaction-form.type";

function isValidationIssue(value: unknown): value is ValidationIssue {
  return (
    isRecord(value) &&
    typeof value.field === "string" &&
    (TRANSACTION_FIELDS as readonly string[]).includes(value.field) &&
    typeof value.code === "string" &&
    Object.hasOwn(TRANSACTION_VALIDATION_MESSAGES, value.code)
  );
}

function isOversellViolation(value: Record<string, unknown>): value is Record<string, unknown> & OversellViolation {
  return (
    typeof value.ticker === "string" &&
    typeof value.date === "string" &&
    typeof value.transactionId === "string" &&
    typeof value.available === "number" &&
    typeof value.requested === "number"
  );
}

// Turns whatever a Convex mutation threw into a shape the form can render.
export function toTransactionMutationError(error: unknown): TransactionMutationError {
  if (!(error instanceof ConvexError) || !isRecord(error.data)) return { kind: "unexpected" };
  const data = error.data;

  if (data.code === TRANSACTION_ERROR_CODES.VALIDATION && Array.isArray(data.issues) && data.issues.every(isValidationIssue)) {
    return { kind: "validation", issues: data.issues };
  }
  if (data.code === TRANSACTION_ERROR_CODES.OVERSELL && isOversellViolation(data)) {
    const { ticker, date, transactionId, available, requested } = data;
    return { kind: "oversell", violation: { ticker, date, transactionId, available, requested } };
  }
  if (data.code === TRANSACTION_ERROR_CODES.NOT_FOUND) return { kind: "not-found" };
  return { kind: "unexpected" };
}
