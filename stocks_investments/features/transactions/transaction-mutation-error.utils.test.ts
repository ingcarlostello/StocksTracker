import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { toTransactionMutationError } from "./transaction-mutation-error.utils";

describe("toTransactionMutationError", () => {
  it("reads a VALIDATION payload", () => {
    const error = new ConvexError({ code: "VALIDATION", issues: [{ field: "date", code: "FUTURE_DATE" }] });
    expect(toTransactionMutationError(error)).toEqual({
      kind: "validation",
      issues: [{ field: "date", code: "FUTURE_DATE" }],
    });
  });

  it("reads an OVERSELL payload and keeps only the violation fields", () => {
    const error = new ConvexError({
      code: "OVERSELL",
      ticker: "AAPL",
      date: "2025-03-01",
      transactionId: "j57...",
      available: 3,
      requested: 4,
    });
    expect(toTransactionMutationError(error)).toEqual({
      kind: "oversell",
      violation: { ticker: "AAPL", date: "2025-03-01", transactionId: "j57...", available: 3, requested: 4 },
    });
  });

  it("reads a VALIDATION payload about an unknown portfolio", () => {
    const error = new ConvexError({ code: "VALIDATION", issues: [{ field: "portfolioId", code: "UNKNOWN_PORTFOLIO" }] });
    expect(toTransactionMutationError(error)).toEqual({
      kind: "validation",
      issues: [{ field: "portfolioId", code: "UNKNOWN_PORTFOLIO" }],
    });
  });

  it("reads NOT_FOUND", () => {
    expect(toTransactionMutationError(new ConvexError({ code: "NOT_FOUND", id: "x" }))).toEqual({ kind: "not-found" });
  });

  it.each([
    ["a plain Error", new Error("network down")],
    ["a ConvexError with a string payload", new ConvexError("boom")],
    ["an unknown code", new ConvexError({ code: "SOMETHING_ELSE" })],
    ["a malformed VALIDATION payload", new ConvexError({ code: "VALIDATION", issues: [{ field: "nope", code: "FUTURE_DATE" }] })],
    ["a malformed OVERSELL payload", new ConvexError({ code: "OVERSELL", ticker: "AAPL", available: "3" })],
    ["a non-error value", "oops"],
  ])("treats %s as unexpected", (_label, error) => {
    expect(toTransactionMutationError(error)).toEqual({ kind: "unexpected" });
  });
});
