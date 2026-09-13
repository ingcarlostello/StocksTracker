import type { PricesErrorCode } from "./prices.type";

export const PRICES_ERROR_MESSAGES: Record<PricesErrorCode, string> = {
  INVALID_SYMBOLS: "Some tickers in your portfolio could not be priced.",
  RATE_LIMITED: "Price updates are limited to a few per minute. Try again shortly.",
  PRICES_UNAVAILABLE: "No recent closing prices are available right now.",
  CONFIGURATION_ERROR: "Price updates are not configured on the server.",
  UPSTREAM_ERROR: "The price provider could not be reached.",
  INTERNAL_ERROR: "Something went wrong while loading prices.",
  NETWORK_ERROR: "Could not connect. Check your internet connection.",
  INVALID_RESPONSE: "Received an unexpected price response.",
};
