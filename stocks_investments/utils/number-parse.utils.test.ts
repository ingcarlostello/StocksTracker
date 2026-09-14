import { describe, expect, it } from "vitest";
import { parseDecimalInput } from "./number-parse.utils";

describe("parseDecimalInput", () => {
  it.each([
    ["10", 10],
    ["0.5", 0.5],
    [".5", 0.5],
    ["12.", 12],
    [" 150.25 ", 150.25],
    ["0", 0],
    ["0.123456789", 0.123456789],
  ])("parses %j as %s", (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected);
  });

  it.each(["", " ", "abc", "1,000", "1.2.3", "-5", "+5", "1e3", "Infinity", "0x10", "1 000", "."])(
    "returns NaN for %j",
    (text) => {
      expect(parseDecimalInput(text)).toBeNaN();
    },
  );
});
