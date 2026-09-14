import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatFixedDecimal,
  formatShares,
  formatSharesExact,
  formatSignedCurrency,
  formatSignedPercent,
  formatTrimmedDecimal,
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

describe("formatSharesExact", () => {
  it.each([
    [10, "10.0000"],
    [0.123456, "0.123456"],
    [0.12346, "0.12346"],
    [1234.5, "1,234.5000"],
  ])("%s → %s", (value, expected) => {
    expect(formatSharesExact(value)).toBe(expected);
  });
});

describe("formatFixedDecimal", () => {
  it.each([
    [2000, 2, "2000.00"],
    [75.125, 2, "75.13"],
    [1234567.891, 2, "1234567.89"],
    [1e21, 2, "1000000000000000000000.00"],
  ])("%s with %i decimals → %s", (value, decimals, expected) => {
    expect(formatFixedDecimal(value, decimals)).toBe(expected);
  });

  it.each([0.5 * 2.01, 3.5 * 200.15, 3 * 33.335, 1 * 1.005, 5.7 * 14.45])(
    "rounds %s exactly like formatCurrency",
    (value) => {
      expect(`$${formatFixedDecimal(value, 2)}`).toBe(formatCurrency(value));
    },
  );
});

describe("formatTrimmedDecimal", () => {
  it.each([
    [0.375, 6, "0.375"],
    [100 / 333, 6, "0.3003"],
    [12, 6, "12"],
    [10.5, 6, "10.5"],
    [0.0000001, 6, "0"],
    [1500, 6, "1500"],
  ])("%s with up to %i decimals → %s", (value, decimals, expected) => {
    expect(formatTrimmedDecimal(value, decimals)).toBe(expected);
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
