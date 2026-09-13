import { describe, expect, it } from "vitest";
import { normalizeSymbols } from "./symbol.service";

describe("normalizeSymbols", () => {
  it("uppercases, trims and dedupes in first-seen order", () => {
    expect(normalizeSymbols([" msft", "AAPL", "aapl", "brk.b", "MSFT "])).toEqual({
      symbols: ["MSFT", "AAPL", "BRK.B"],
      invalid: [],
    });
  });

  it("reports invalid raw inputs without dropping the valid ones", () => {
    expect(normalizeSymbols(["AAPL", "", "TOOLONGX", "BAD$"])).toEqual({
      symbols: ["AAPL"],
      invalid: ["", "TOOLONGX", "BAD$"],
    });
  });

  it("handles an empty list", () => {
    expect(normalizeSymbols([])).toEqual({ symbols: [], invalid: [] });
  });
});
