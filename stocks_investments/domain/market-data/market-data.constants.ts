// Upper bound on tickers per price request; a personal portfolio stays far below it.
export const MAX_SYMBOLS_PER_REQUEST = 50;

// Weekdays tried, newest first, when looking for the latest published close (covers market holidays).
export const MAX_CANDIDATE_TRADING_DATES = 3;
