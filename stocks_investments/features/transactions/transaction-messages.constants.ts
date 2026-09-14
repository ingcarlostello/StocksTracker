import type { TransactionValidationCode } from "@/domain/transactions/transaction.type";

export const TRANSACTION_VALIDATION_MESSAGES: Record<TransactionValidationCode, string> = {
  MISSING_PORTFOLIO: "Choose a portfolio.",
  UNKNOWN_PORTFOLIO: "This portfolio no longer exists. Choose another one.",
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
  DELETE_UNEXPECTED: "The transaction could not be deleted. Please try again.",
} as const;

export const TRANSACTION_EDIT_MESSAGES = {
  CHANGED_ELSEWHERE:
    "This transaction was changed somewhere else while you were editing. Load the latest version before saving; your unsaved changes will be replaced.",
  DELETED_ELSEWHERE: "This transaction was deleted, so these changes can't be saved.",
  NOT_FOUND_PAGE: "This transaction doesn't exist or was deleted.",
  LOAD_LATEST: "Load latest version",
  BACK: "Back to transactions",
  LOADING: "Loading transaction…",
} as const;

export const TRANSACTION_LIST_MESSAGES = {
  LOADING: "Loading transactions…",
  EMPTY_SCOPE: "No transactions yet.",
  NO_MATCHES: "No transactions match these filters.",
  DATE_RANGE_INVALID: "The end date must be on or after the start date.",
  DELETED_STATUS: "Transaction deleted.",
  ALREADY_DELETED: "This transaction was already deleted.",
  DELETE_TITLE: "Delete transaction?",
  BLOCKED_TITLE: "This buy can't be deleted",
  IRREVERSIBLE: "This can't be undone.",
  DELETE_IN_PROGRESS: "Deleting… You can close this dialog; the deletion finishes as soon as the connection allows.",
  DELETE_WAIT: "Another transaction is still being deleted. Try again once it finishes.",
} as const;
