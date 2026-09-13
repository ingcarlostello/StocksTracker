import { isIsoDate } from "../../utils/date.utils";
import { TICKER_REGEX, TRANSACTION_TYPES } from "./transaction.constants";
import type {
  TransactionInput,
  TransactionType,
  ValidationIssue,
  ValidationResult,
} from "./transaction.type";

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value);
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

// `today` is an ISO date supplied by the caller so this stays pure.
export function validateTransactionInput(
  input: TransactionInput,
  today: string,
): ValidationResult {
  const ticker = normalizeTicker(input.ticker);
  const issues: ValidationIssue[] = [];

  if (!TICKER_REGEX.test(ticker)) {
    issues.push({ field: "ticker", code: "INVALID_TICKER" });
  }
  if (!isTransactionType(input.type)) {
    issues.push({ field: "type", code: "INVALID_TYPE" });
  }
  if (!isIsoDate(input.date)) {
    issues.push({ field: "date", code: "INVALID_DATE" });
  } else if (input.date > today) {
    issues.push({ field: "date", code: "FUTURE_DATE" });
  }
  if (!isPositiveFinite(input.quantity)) {
    issues.push({ field: "quantity", code: "INVALID_QUANTITY" });
  }
  if (!isPositiveFinite(input.price)) {
    issues.push({ field: "price", code: "INVALID_PRICE" });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: { ...input, ticker } };
}

// Kept unrounded; rounding happens only when formatting for display.
export function calculateTotalAmount(quantity: number, price: number): number {
  return quantity * price;
}
