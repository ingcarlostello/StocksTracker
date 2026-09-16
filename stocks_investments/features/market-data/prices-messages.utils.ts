import { PricesApiError } from "./prices.errors";
import { PRICES_ERROR_MESSAGES } from "./prices-messages.constants";

// The only place a rejected price request becomes a sentence: anything that is not a PricesApiError
// (a plain Error, a thrown string, null) has no code to look up and reads as an internal failure.
export function pricesErrorMessage(error: unknown): string {
  return error instanceof PricesApiError
    ? PRICES_ERROR_MESSAGES[error.code]
    : PRICES_ERROR_MESSAGES.INTERNAL_ERROR;
}
