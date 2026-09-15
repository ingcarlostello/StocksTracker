import { describe, expect, it } from "vitest";
import type { SortDirection, SortState } from "../types/sort.type";
import { compareValues, sortedDirection, sortedTableCaption, toggleSortState } from "./sort.utils";

type Key = "name" | "size";

const DEFAULTS: Readonly<Record<Key, SortDirection>> = { name: "asc", size: "desc" };

function sort(key: Key, dir: SortDirection): SortState<Key> {
  return { key, dir };
}

describe("compareValues", () => {
  it("orders numbers and strings", () => {
    expect(compareValues(1, 2)).toBe(-1);
    expect(compareValues(2, 1)).toBe(1);
    expect(compareValues(2, 2)).toBe(0);
    expect(compareValues("BRK.B", "BRKA")).toBe(-1);
  });

  it("treats -0 and 0 as equal", () => {
    expect(compareValues(-0, 0)).toBe(0);
  });

  it("orders SIP tickers by code unit", () => {
    expect(["BRKB", "BRK.B", "A", "AA", "BRK.A"].sort(compareValues)).toEqual(["A", "AA", "BRK.A", "BRK.B", "BRKB"]);
  });
});

describe("toggleSortState", () => {
  it("flips the direction of the sorted key", () => {
    expect(toggleSortState(sort("name", "asc"), "name", DEFAULTS)).toEqual(sort("name", "desc"));
    expect(toggleSortState(sort("name", "desc"), "name", DEFAULTS)).toEqual(sort("name", "asc"));
  });

  it("starts another key in its default direction", () => {
    expect(toggleSortState(sort("name", "asc"), "size", DEFAULTS)).toEqual(sort("size", "desc"));
    expect(toggleSortState(sort("size", "asc"), "name", DEFAULTS)).toEqual(sort("name", "asc"));
  });

  it("does not mutate the current sort", () => {
    const current = Object.freeze(sort("name", "asc"));
    expect(toggleSortState(current, "name", DEFAULTS)).toEqual(sort("name", "desc"));
    expect(toggleSortState(current, "size", DEFAULTS)).toEqual(sort("size", "desc"));
    expect(current).toEqual(sort("name", "asc"));
  });
});

describe("sortedDirection", () => {
  it("returns the direction for the sorted key", () => {
    expect(sortedDirection(sort("name", "asc"), "name")).toBe("asc");
    expect(sortedDirection(sort("size", "desc"), "size")).toBe("desc");
  });

  it("returns null for every other key", () => {
    expect(sortedDirection(sort("name", "asc"), "size")).toBeNull();
    expect(sortedDirection(sort("size", "desc"), "name")).toBeNull();
  });
});

describe("sortedTableCaption", () => {
  it("names the subject, scope, column and direction", () => {
    expect(sortedTableCaption("Holdings", "all portfolios", "Ticker", "asc")).toBe(
      "Holdings in all portfolios, sorted by Ticker ascending",
    );
    expect(sortedTableCaption("Transactions", "Retiro", "Total", "desc")).toBe(
      "Transactions in Retiro, sorted by Total descending",
    );
  });
});
