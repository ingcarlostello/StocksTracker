import { describe, expect, it } from "vitest";
import { toTransactionLike } from "./transaction.utils";

describe("toTransactionLike", () => {
  it("maps every stored field, including the portfolio, and drops storage-only ones", () => {
    const stored = {
      _id: "t1",
      _creationTime: 99,
      portfolioId: "p-retiro",
      ticker: "AAPL",
      type: "SELL" as const,
      date: "2025-03-01",
      quantity: 2,
      price: 150,
      totalAmount: 300,
      createdAt: 7,
    };
    expect(toTransactionLike(stored)).toEqual({
      id: "t1",
      portfolioId: "p-retiro",
      ticker: "AAPL",
      type: "SELL",
      date: "2025-03-01",
      quantity: 2,
      price: 150,
      totalAmount: 300,
      createdAt: 7,
    });
  });
});
