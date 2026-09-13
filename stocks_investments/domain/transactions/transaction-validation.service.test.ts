import { describe, expect, it } from "vitest";
import type { TransactionInput } from "./transaction.type";
import {
  calculateTotalAmount,
  normalizeTicker,
  validateTransactionInput,
} from "./transaction-validation.service";

const TODAY = "2025-06-15";
const valid: TransactionInput = {
  ticker: "AAPL",
  type: "BUY",
  date: "2025-06-10",
  quantity: 1.5,
  price: 100.25,
};

function codesFor(input: Partial<TransactionInput>): string[] {
  const result = validateTransactionInput({ ...valid, ...input }, TODAY);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

describe("normalizeTicker", () => {
  it("trims and uppercases", () => expect(normalizeTicker("  brk.b ")).toBe("BRK.B"));
});

describe("validateTransactionInput", () => {
  it("accepts a valid input and returns the normalized ticker", () => {
    expect(validateTransactionInput({ ...valid, ticker: " aapl " }, TODAY)).toEqual({
      ok: true,
      value: { ...valid, ticker: "AAPL" },
    });
  });

  it("accepts today's date and share-class tickers", () => {
    expect(codesFor({ date: TODAY, ticker: "BRK.B" })).toEqual([]);
  });

  it.each([
    ["", "INVALID_TICKER"],
    ["TOOLONGX", "INVALID_TICKER"],
    ["AA1", "INVALID_TICKER"],
    ["BRK.", "INVALID_TICKER"],
  ])("rejects ticker %j", (ticker, code) => {
    expect(codesFor({ ticker })).toEqual([code]);
  });

  it.each([
    ["2025-02-30", "INVALID_DATE"],
    ["2025-6-10", "INVALID_DATE"],
    ["2025-06-10T12:00", "INVALID_DATE"],
    ["not a date", "INVALID_DATE"],
    ["2025-06-16", "FUTURE_DATE"],
  ])("rejects date %j", (date, code) => {
    expect(codesFor({ date })).toEqual([code]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects quantity %s", (quantity) => {
    expect(codesFor({ quantity })).toEqual(["INVALID_QUANTITY"]);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("rejects price %s", (price) => {
    expect(codesFor({ price })).toEqual(["INVALID_PRICE"]);
  });

  it("rejects an unknown type", () => {
    expect(codesFor({ type: "HOLD" as TransactionInput["type"] })).toEqual(["INVALID_TYPE"]);
  });

  it("reports every invalid field at once", () => {
    expect(codesFor({ ticker: "?", date: "2025-02-30", quantity: 0, price: -1 })).toEqual([
      "INVALID_TICKER",
      "INVALID_DATE",
      "INVALID_QUANTITY",
      "INVALID_PRICE",
    ]);
  });
});

describe("calculateTotalAmount", () => {
  it("multiplies quantity by price without rounding", () => {
    expect(calculateTotalAmount(1.5, 100.25)).toBe(150.375);
  });
});
