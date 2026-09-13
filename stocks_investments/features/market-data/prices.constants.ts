// Closes change at most once per trading day, so 5 minutes of freshness costs nothing in accuracy.
export const PRICES_STALE_TIME_MS = 5 * 60_000;

// Used when a 429 response carries no usable Retry-After header.
export const PRICES_RATE_LIMIT_FALLBACK_SECONDS = 60;
