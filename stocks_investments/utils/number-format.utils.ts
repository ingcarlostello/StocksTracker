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

// Takes a ratio: 1/3 → "+33.33%".
export function formatSignedPercent(ratio: number): string {
  return signedPercent.format(ratio);
}
