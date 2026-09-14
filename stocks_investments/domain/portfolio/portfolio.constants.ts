// Share counts at or below this are treated as a closed position (float64 noise).
export const SHARES_EPSILON = 1e-9;

// Id given to a not-yet-saved transaction during client-side validation.
export const CANDIDATE_TRANSACTION_ID = "__candidate__";

// Counted in Unicode code points, so "Carro soñado" is 12 characters.
export const PORTFOLIO_NAME_MAX_LENGTH = 40;

export const PORTFOLIO_ERROR_CODES = {
  VALIDATION: "VALIDATION",
  DUPLICATE_NAME: "DUPLICATE_NAME",
  NOT_FOUND: "NOT_FOUND",
  NOT_EMPTY: "NOT_EMPTY",
} as const;
