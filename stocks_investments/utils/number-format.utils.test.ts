import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatShares,
  formatSignedCurrency,
  formatSignedPercent,
} from "./number-format.utils";

describe("formatCurrency", () => {
  it.each([
    [1893.2, "$1,893.20"],
    [0, "$0.00"],
    [12432.555, "$12,432.56"],
    [-60, "-$60.00"],
  ])("%s → %s", (value, expected) => {
    expect(formatCurrency(value)).toBe(expected);
  });
});

describe("formatSignedCurrency", () => {
  it.each([
    [393.2, "+$393.20"],
    [-60, "-$60.00"],
    [0, "$0.00"],
    [-5.684e-14, "$0.00"],
  ])("%s → %s", (value, expected) => {
    expect(formatSignedCurrency(value)).toBe(expected);
  });
});

describe("formatShares", () => {
  it.each([
    [10, "10.0000"],
    [0.75, "0.7500"],
    [1234.56789, "1,234.5679"],
  ])("%s → %s", (value, expected) => {
    expect(formatShares(value)).toBe(expected);
  });
});

describe("formatSignedPercent", () => {
  it.each([
    [1 / 3, "+33.33%"],
    [0.2621, "+26.21%"],
    [-0.2, "-20.00%"],
    [0, "0.00%"],
    [-1.9e-16, "0.00%"],
  ])("%s → %s", (ratio, expected) => {
    expect(formatSignedPercent(ratio)).toBe(expected);
  });
});
