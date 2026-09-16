// Closes change at most once per trading day, so 5 minutes of freshness costs nothing in accuracy.
export const PRICES_STALE_TIME_MS = 5 * 60_000;

// Used when a 429 response carries no usable Retry-After header.
export const PRICES_RATE_LIMIT_FALLBACK_SECONDS = 60;

// A published closing price never changes, so a year-end response is never stale.
export const YEAR_END_PRICES_STALE_TIME_MS = Number.POSITIVE_INFINITY;

// Long enough that walking back and forth between years costs no request for a whole session.
export const YEAR_END_PRICES_GC_TIME_MS = 24 * 60 * 60_000;
