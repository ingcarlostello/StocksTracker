import { describe, expect, it } from "vitest";
import type { OversellViolation } from "@/domain/transactions/transaction.type";
import { blockedPortfolioView, invalidHistoryMessage } from "./portfolio-view.utils";

const violation: OversellViolation = {
  ticker: "AAPL",
  date: "2024-11-10",
  transactionId: "t1",
  available: 3,
  requested: 5,
};

describe("invalidHistoryMessage", () => {
  it("names the sale that sells more than was held", () => {
    expect(invalidHistoryMessage(violation)).toBe(
      "Your history sells 5.0000 AAPL on Nov 10, 2024, but only 3.0000 shares were held then. Fix that transaction to see your portfolio.",
    );
  });

  it("keeps exact share digits", () => {
    expect(invalidHistoryMessage({ ...violation, requested: 0.30000001 })).toContain("sells 0.30000001 AAPL");
  });
});

describe("blockedPortfolioView", () => {
  it("keeps the loading state", () => {
    expect(blockedPortfolioView({ status: "loading" })).toEqual({ status: "loading" });
  });

  it("keeps the no-portfolios state", () => {
    expect(blockedPortfolioView({ status: "no-portfolios" })).toEqual({ status: "no-portfolios" });
  });

  it("turns an invalid history into its alert message", () => {
    const state = blockedPortfolioView({ status: "invalid-history", violation });
    expect(state).toEqual({ status: "invalid-history", message: invalidHistoryMessage(violation) });
    expect(state).toEqual({
      status: "invalid-history",
      message:
        "Your history sells 5.0000 AAPL on Nov 10, 2024, but only 3.0000 shares were held then. Fix that transaction to see your portfolio.",
    });
  });
});
