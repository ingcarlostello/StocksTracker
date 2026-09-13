export const API_ENDPOINTS = {
  PRICES: "/api/prices",
} as const;

export const API_ERROR_CODES = [
  "INVALID_SYMBOLS",
  "RATE_LIMITED",
  "PRICES_UNAVAILABLE",
  "CONFIGURATION_ERROR",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;
