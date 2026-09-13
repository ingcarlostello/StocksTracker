import { describe, expect, it } from "vitest";
import { compareTransactions, sortTransactions } from "./transaction-order.service";

describe("sortTransactions", () => {
  it("orders by date, then createdAt, then id", () => {
    const transactions = [
      { id: "b", date: "2025-01-02", createdAt: 5 },
      { id: "a", date: "2025-01-02", createdAt: 5 },
      { id: "c", date: "2025-01-02", createdAt: 1 },
      { id: "d", date: "2024-12-31", createdAt: 9 },
    ];
    expect(sortTransactions(transactions).map((t) => t.id)).toEqual(["d", "c", "a", "b"]);
  });

  it("does not mutate the input array", () => {
    const transactions = [
      { id: "b", date: "2025-01-02", createdAt: 1 },
      { id: "a", date: "2025-01-01", createdAt: 1 },
    ];
    sortTransactions(transactions);
    expect(transactions.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("treats identical keys as equal", () => {
    const t = { id: "a", date: "2025-01-01", createdAt: 1 };
    expect(compareTransactions(t, { ...t })).toBe(0);
  });
});
