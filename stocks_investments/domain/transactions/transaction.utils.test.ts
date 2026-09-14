import { describe, expect, it } from "vitest";
import type { TransactionInput, TransactionLike } from "./transaction.type";
import { isSameStoredTransaction, isSameTransactionInput, toTransactionLike } from "./transaction.utils";

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

const INPUT: TransactionInput = {
  portfolioId: "p-retiro",
  ticker: "AAPL",
  type: "BUY",
  date: "2025-03-01",
  quantity: 100 / 333,
  price: 333,
};

const STORED: TransactionLike = {
  ...INPUT,
  id: "t1",
  totalAmount: (100 / 333) * 333,
  createdAt: 7,
};

// A value of the same type that is guaranteed to differ, for any key of a stored transaction.
function changedValue(key: keyof TransactionLike, value: TransactionLike[keyof TransactionLike]) {
  if (key === "type") return value === "BUY" ? "SELL" : "BUY";
  return typeof value === "number" ? value + 1 : `${value}-changed`;
}

describe("isSameTransactionInput", () => {
  it("is true for identical values", () => {
    expect(isSameTransactionInput(INPUT, { ...INPUT })).toBe(true);
  });

  it("is false for a quantity one ulp away", () => {
    const nextUp = INPUT.quantity + Number.EPSILON * INPUT.quantity;
    expect(nextUp).not.toBe(INPUT.quantity);
    expect(isSameTransactionInput(INPUT, { ...INPUT, quantity: nextUp })).toBe(false);
  });

  it.each([
    ["date", { date: "2025-03-02" }],
    ["portfolio", { portfolioId: "p-viajes" }],
    ["type", { type: "SELL" as const }],
    ["ticker", { ticker: "MSFT" }],
    ["price", { price: 333.01 }],
  ])("is false for a changed %s", (_label, change) => {
    expect(isSameTransactionInput(INPUT, { ...INPUT, ...change })).toBe(false);
  });

  it("compares tickers exactly, without normalizing", () => {
    expect(isSameTransactionInput(INPUT, { ...INPUT, ticker: "aapl" })).toBe(false);
  });
});

describe("isSameStoredTransaction", () => {
  it("is true for identical values", () => {
    expect(isSameStoredTransaction(STORED, { ...STORED })).toBe(true);
  });

  it("ignores the id", () => {
    expect(isSameStoredTransaction(STORED, { ...STORED, id: "t2" })).toBe(true);
  });

  // Iterates the keys of the sample, so a field added to TransactionLike later is covered automatically.
  const comparedKeys = (Object.keys(STORED) as (keyof TransactionLike)[]).filter((key) => key !== "id");

  it.each(comparedKeys)("is false when only %s changes", (key) => {
    const changed = { ...STORED, [key]: changedValue(key, STORED[key]) } as TransactionLike;
    expect(isSameStoredTransaction(STORED, changed)).toBe(false);
  });
});
