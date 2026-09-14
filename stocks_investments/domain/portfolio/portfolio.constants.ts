// Share counts at or below this are treated as a closed position (float64 noise).
export const SHARES_EPSILON = 1e-9;

// Id given to a not-yet-saved transaction during client-side validation.
export const CANDIDATE_TRANSACTION_ID = "__candidate__";
