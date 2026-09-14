import type { TransactionValidationCode } from "@/domain/transactions/transaction.type";

export const TRANSACTION_VALIDATION_MESSAGES: Record<TransactionValidationCode, string> = {
  INVALID_TICKER: "Enter a valid US ticker, like AAPL or BRK.B.",
  INVALID_TYPE: "Choose Buy or Sell.",
  INVALID_DATE: "Enter a valid date.",
  FUTURE_DATE: "The date can't be in the future.",
  INVALID_QUANTITY: "Enter a number of shares greater than 0.",
  INVALID_PRICE: "Enter a price greater than 0.",
};

export const TRANSACTION_FORM_MESSAGES = {
  INVALID_AMOUNT: "Enter an amount greater than 0.",
  AMOUNT_HINT: "Calculated from shares × price.",
  SHARES_HINT: "Calculated from amount ÷ price.",
} as const;

export const TRANSACTION_ERROR_MESSAGES = {
  NOT_FOUND: "This transaction no longer exists.",
  UNEXPECTED: "The transaction could not be saved. Please try again.",
} as const;
