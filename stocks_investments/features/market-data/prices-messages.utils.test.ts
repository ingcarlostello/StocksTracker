import { describe, expect, it } from "vitest";
import { PricesApiError } from "./prices.errors";
import { PRICES_ERROR_MESSAGES } from "./prices-messages.constants";
import { pricesErrorMessage } from "./prices-messages.utils";

describe("pricesErrorMessage", () => {
  it("resolves the sentence of a PricesApiError code", () => {
    expect(pricesErrorMessage(new PricesApiError("RATE_LIMITED", "slow down", 429, 60))).toBe(
      PRICES_ERROR_MESSAGES.RATE_LIMITED,
    );
    expect(pricesErrorMessage(new PricesApiError("NETWORK_ERROR", "offline"))).toBe(
      PRICES_ERROR_MESSAGES.NETWORK_ERROR,
    );
  });

  it("covers the two year-end codes", () => {
    expect(pricesErrorMessage(new PricesApiError("INVALID_YEAR", "bad year", 400))).toBe(
      "Closing prices can't be requested for that year.",
    );
    expect(pricesErrorMessage(new PricesApiError("PRICE_HISTORY_UNAVAILABLE", "too old", 404))).toBe(
      "Those closing prices are older than the history the market data plan provides.",
    );
  });

  it("falls back to INTERNAL_ERROR for anything without a code", () => {
    for (const rejection of [new Error("boom"), "boom", null, undefined]) {
      expect(pricesErrorMessage(rejection)).toBe(PRICES_ERROR_MESSAGES.INTERNAL_ERROR);
    }
  });
});
