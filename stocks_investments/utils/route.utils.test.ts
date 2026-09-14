import { describe, expect, it } from "vitest";
import { isRouteActive, searchParamsFromRecord, withQuery } from "./route.utils";

describe("isRouteActive", () => {
  it.each([
    ["/transactions", "/transactions", true],
    ["/transactions/new", "/transactions", true],
    ["/transactions/abc/edit", "/transactions", true],
    ["/transactions-old", "/transactions", false],
    ["/portfolio", "/transactions", false],
  ])("%s inside %s → %s", (pathname, href, expected) => {
    expect(isRouteActive(pathname, href)).toBe(expected);
  });
});

describe("withQuery", () => {
  it("returns the path alone for an empty query", () => {
    expect(withQuery("/transactions", "")).toBe("/transactions");
  });

  it("appends a non-empty query after a question mark", () => {
    expect(withQuery("/transactions", "type=sell&sort=ticker")).toBe("/transactions?type=sell&sort=ticker");
  });
});

describe("searchParamsFromRecord", () => {
  it("keeps single values, takes the first value of an array and skips undefined", () => {
    const params = searchParamsFromRecord({
      ticker: "AAPL",
      type: ["sell", "buy"],
      from: undefined,
    });
    expect(params.get("ticker")).toBe("AAPL");
    expect(params.get("type")).toBe("sell");
    expect(params.getAll("type")).toEqual(["sell"]);
    expect(params.has("from")).toBe(false);
    expect(params.toString()).toBe("ticker=AAPL&type=sell");
  });

  it("skips an empty array", () => {
    expect(searchParamsFromRecord({ ticker: [] }).has("ticker")).toBe(false);
  });

  it("returns empty params for an empty record", () => {
    expect(searchParamsFromRecord({}).toString()).toBe("");
  });
});
