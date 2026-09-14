export const TRANSACTION_TYPES = ["BUY", "SELL"] as const;

export const TRANSACTION_FIELDS = ["ticker", "type", "date", "quantity", "price"] as const;

// SIP format: 1–6 letters with an optional share-class suffix (e.g. "BRK.B").
export const TICKER_REGEX = /^[A-Z]{1,6}(\.[A-Z]{1,2})?$/;

// Trade dates are US market days, so "today" is evaluated in New York time.
export const MARKET_TIME_ZONE = "America/New_York";

export const TRANSACTION_ERROR_CODES = {
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  OVERSELL: "OVERSELL",
} as const;
