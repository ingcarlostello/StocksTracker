import { describe, expect, it } from "vitest";
import { parseDecimalInput } from "./number-parse.utils";
import {
  formatCurrency,
  formatExactDecimal,
  formatFixedDecimal,
  formatShares,
  formatSharesExact,
  formatSignedCurrency,
  formatSignedPercent,
  formatTrimmedDecimal,
  signedCurrencyLabel,
  signedPercentLabel,
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

// Deterministic PRNG (mulberry32) so the round-trip sample is the same on every run.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("formatExactDecimal", () => {
  it.each([
    [0.375, "0.375"],
    [1e-7, "0.0000001"],
    [2e-9, "0.000000002"],
    [1.5e-7, "0.00000015"],
    [1e21, "1000000000000000000000"],
    [1.5e21, "1500000000000000000000"],
    [100 / 333, "0.3003003003003003"],
    [12, "12"],
  ])("%s → %s", (value, expected) => {
    expect(formatExactDecimal(value)).toBe(expected);
  });

  it.each([5e-324, Number.MAX_VALUE])("writes %s without exponent or grouping", (value) => {
    const text = formatExactDecimal(value);
    expect(text).not.toMatch(/[e,]/i);
    expect(parseDecimalInput(text)).toBe(value);
  });

  it.each([
    [333, 2, "333.00"],
    [0.1, 2, "0.10"],
    [186.255, 2, "186.255"],
    [1e21, 2, "1000000000000000000000.00"],
    [1e-7, 2, "0.0000001"],
  ])("%s with at least %i decimals → %s", (value, minFractionDigits, expected) => {
    expect(formatExactDecimal(value, minFractionDigits)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])("leaves %s to validation", (value) => {
    expect(formatExactDecimal(value)).toBe(String(value));
  });

  it.each([100 / 333, 1 / 3, 0.1 + 0.2, 2 ** 53 + 2])("parses back to exactly %s", (value) => {
    expect(parseDecimalInput(formatExactDecimal(value))).toBe(value);
    expect(parseDecimalInput(formatExactDecimal(value, 2))).toBe(value);
  });

  it("parses back to exactly the same double for 10k seeded values across exp(±50)", () => {
    const random = seededRandom(20260913);
    const failures: string[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      const value = Math.exp((random() * 2 - 1) * 50);
      for (const minFractionDigits of [0, 2]) {
        const text = formatExactDecimal(value, minFractionDigits);
        if (parseDecimalInput(text) !== value) failures.push(`${value} (${minFractionDigits}) → ${text}`);
      }
    }
    expect(failures).toEqual([]);
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

const SIGNED_CURRENCY_CASES = [
  [393.2, "+$393.20", "positive"],
  [-60, "-$60.00", "negative"],
  [0, "$0.00", "zero"],
  [-0, "$0.00", "zero"],
  [-5.7e-14, "$0.00", "zero"],
  [-0.004, "$0.00", "zero"],
  [-0.005, "-$0.01", "negative"],
  [0.005, "+$0.01", "positive"],
  // Math.round(1.005 * 100) / 100 would say 1.00.
  [1.005, "+$1.01", "positive"],
  [2.675, "+$2.68", "positive"],
] as const;

const SIGNED_PERCENT_CASES = [
  [1 / 3, "+33.33%", "positive"],
  [-0.2, "-20.00%", "negative"],
  [0, "0.00%", "zero"],
  [-1.9e-16, "0.00%", "zero"],
  [0.00001, "0.00%", "zero"],
  [-0.00004, "0.00%", "zero"],
  [0.00005, "+0.01%", "positive"],
  [-0.00005, "-0.01%", "negative"],
] as const;

// The sign a reader sees in the text.
function signOfText(label: string): string {
  return label.startsWith("+") ? "positive" : label.startsWith("-") ? "negative" : "zero";
}

describe("signedCurrencyLabel", () => {
  it.each(SIGNED_CURRENCY_CASES)("%s → %s (%s)", (value, label, sign) => {
    expect(signedCurrencyLabel(value)).toEqual({ label, sign });
  });
});

describe("signedPercentLabel", () => {
  it.each(SIGNED_PERCENT_CASES)("%s → %s (%s)", (ratio, label, sign) => {
    expect(signedPercentLabel(ratio)).toEqual({ label, sign });
  });
});

describe("signed labels", () => {
  it("labels equal formatSignedCurrency / formatSignedPercent", () => {
    for (const [value] of SIGNED_CURRENCY_CASES) {
      expect(signedCurrencyLabel(value).label).toBe(formatSignedCurrency(value));
    }
    for (const [ratio] of SIGNED_PERCENT_CASES) {
      expect(signedPercentLabel(ratio).label).toBe(formatSignedPercent(ratio));
    }
  });

  it("sign matches the displayed text for seeded values", () => {
    const random = seededRandom(42);
    const values: number[] = [];
    for (let i = 0; i < 2_000; i += 1) {
      const magnitude = Math.exp((random() * 2 - 1) * 12);
      values.push(random() < 0.5 ? -magnitude : magnitude);
    }
    // Values next to the rounding boundaries of cents and hundredths of a percent.
    for (const [boundary, nudge] of [
      [0.005, 1e-12],
      [0.00005, 1e-15],
    ]) {
      values.push(boundary + nudge, boundary - nudge, -boundary + nudge, -boundary - nudge);
    }

    const failures: string[] = [];
    for (const value of values) {
      for (const { label, sign } of [signedCurrencyLabel(value), signedPercentLabel(value)]) {
        if (sign !== signOfText(label)) failures.push(`${value} → ${label} (${sign})`);
      }
    }
    expect(failures).toEqual([]);
  });
});
