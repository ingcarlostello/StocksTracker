import {
  DISPLAY_CURRENCY,
  DISPLAY_LOCALE,
  PERCENT_DECIMALS,
  SHARES_DECIMALS,
} from "../constants/format.constants";

const currency = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "currency",
  currency: DISPLAY_CURRENCY,
});

// exceptZero: float noise such as -5.7e-14 rounds to "$0.00", never "-$0.00".
const signedCurrency = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "currency",
  currency: DISPLAY_CURRENCY,
  signDisplay: "exceptZero",
});

const shares = new Intl.NumberFormat(DISPLAY_LOCALE, {
  minimumFractionDigits: SHARES_DECIMALS,
  maximumFractionDigits: SHARES_DECIMALS,
});

// At least the display decimals, but never hides a difference the user entered (e.g. in error messages).
const exactShares = new Intl.NumberFormat(DISPLAY_LOCALE, {
  minimumFractionDigits: SHARES_DECIMALS,
  maximumFractionDigits: 9,
});

const signedPercent = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "percent",
  minimumFractionDigits: PERCENT_DECIMALS,
  maximumFractionDigits: PERCENT_DECIMALS,
  signDisplay: "exceptZero",
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatSignedCurrency(value: number): string {
  return signedCurrency.format(value);
}

export function formatShares(value: number): string {
  return shares.format(value);
}

export function formatSharesExact(value: number): string {
  return exactShares.format(value);
}

const plainDecimalFormats = new Map<string, Intl.NumberFormat>();

// Intl (not toFixed) so input text rounds exactly like formatCurrency; no grouping keeps it parseable.
function plainDecimal(minDecimals: number, maxDecimals: number): Intl.NumberFormat {
  const key = `${minDecimals}:${maxDecimals}`;
  let format = plainDecimalFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(DISPLAY_LOCALE, {
      useGrouping: false,
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    plainDecimalFormats.set(key, format);
  }
  return format;
}

// Plain, editable text for an input: 2000 → "2000.00".
export function formatFixedDecimal(value: number, decimals: number): string {
  return plainDecimal(decimals, decimals).format(value);
}

// Plain, editable text without trailing zeros: 0.3750 → "0.375", 12 → "12".
export function formatTrimmedDecimal(value: number, maxDecimals: number): string {
  return plainDecimal(0, maxDecimals).format(value);
}

// String(value) switches to exponent notation below 1e-6 and from 1e21: "1.5e-7", "1e+21".
const EXPONENT_NOTATION_REGEX = /^(\d)(?:\.(\d+))?e([+-]\d+)$/;

function expandExponent(text: string): string {
  const match = EXPONENT_NOTATION_REGEX.exec(text);
  if (!match) return text;
  const digits = `${match[1]}${match[2] ?? ""}`;
  // Index of the decimal point within `digits` once the exponent is applied.
  const pointIndex = 1 + Number(match[3]);
  if (pointIndex <= 0) return `0.${"0".repeat(-pointIndex)}${digits}`;
  if (pointIndex >= digits.length) return `${digits}${"0".repeat(pointIndex - digits.length)}`;
  return `${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}

function padFraction(text: string, minFractionDigits: number): string {
  if (minFractionDigits <= 0) return text;
  const pointIndex = text.indexOf(".");
  const fractionDigits = pointIndex === -1 ? 0 : text.length - pointIndex - 1;
  const padding = "0".repeat(Math.max(0, minFractionDigits - fractionDigits));
  return pointIndex === -1 ? `${text}.${padding}` : `${text}${padding}`;
}

// Editable input text that parses back to exactly `value` (the shortest round-trip digits, never rounded):
// 100/333 → "0.3003003003003003", 1e-7 → "0.0000001", (333, 2) → "333.00". Not for display.
export function formatExactDecimal(value: number, minFractionDigits = 0): string {
  if (!Number.isFinite(value) || value < 0) return String(value);
  return padFraction(expandExponent(String(value)), minFractionDigits);
}

// Takes a ratio: 1/3 → "+33.33%".
export function formatSignedPercent(ratio: number): string {
  return signedPercent.format(ratio);
}
