import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { portfolioErrorMessage, toPortfolioMutationError } from "./portfolio-mutation-error.utils";

describe("toPortfolioMutationError", () => {
  it.each([
    [{ code: "VALIDATION", issue: "EMPTY_NAME" }, { kind: "validation", issue: "EMPTY_NAME" }],
    [{ code: "VALIDATION", issue: "NAME_TOO_LONG" }, { kind: "validation", issue: "NAME_TOO_LONG" }],
    [{ code: "DUPLICATE_NAME", name: "Retiro" }, { kind: "duplicate-name" }],
    [{ code: "NOT_FOUND", id: "p1" }, { kind: "not-found" }],
    [{ code: "NOT_EMPTY", id: "p1" }, { kind: "not-empty" }],
  ])("reads %j", (data, expected) => {
    expect(toPortfolioMutationError(new ConvexError(data))).toEqual(expected);
  });

  it.each([
    ["a plain Error", new Error("network down")],
    ["a ConvexError with a string payload", new ConvexError("boom")],
    ["an unknown code", new ConvexError({ code: "SOMETHING_ELSE" })],
    ["an unknown validation issue", new ConvexError({ code: "VALIDATION", issue: "BAD" })],
    ["a non-error value", "oops"],
  ])("treats %s as unexpected", (_label, error) => {
    expect(toPortfolioMutationError(error)).toEqual({ kind: "unexpected" });
  });
});

describe("portfolioErrorMessage", () => {
  it("explains a blocked delete", () => {
    expect(portfolioErrorMessage({ kind: "not-empty" })).toBe("Delete this portfolio's transactions before deleting it.");
  });

  it("explains a name that is too long", () => {
    expect(portfolioErrorMessage({ kind: "validation", issue: "NAME_TOO_LONG" })).toBe("Use 40 characters or fewer.");
  });
});
