// Upper bound on tickers per price request; a personal portfolio stays far below it.
export const MAX_SYMBOLS_PER_REQUEST = 50;

// Weekdays tried, newest first, when looking for the latest published close (covers market holidays).
export const MAX_CANDIDATE_TRADING_DATES = 3;

// Every close date the server can answer with, seen from the client: the server's own 3 candidates plus
// one weekday of clock skew on each side, so a ticker held at the returned date is never left unpriced.
export const VALUATION_CANDIDATE_DATES = MAX_CANDIDATE_TRADING_DATES + 2;

// Day arithmetic counts days since the 1970 epoch, so earlier years are outside the helpers' era.
export const PERFORMANCE_MIN_YEAR = 1970;

export const YEAR_PARAM_REGEX = /^\d{4}$/;

// A 403 on a candidate at least this old is the provider's history limit, not a close that is still
// unpublished; the two are indistinguishable from the response body alone.
export const HISTORY_LIMIT_MIN_AGE_DAYS = 7;
