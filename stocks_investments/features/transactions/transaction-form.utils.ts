import {
  calculateQuantityFromAmount,
  calculateTotalAmount,
  validateTransactionInput,
} from "@/domain/transactions/transaction-validation.service";
import type { ValidationIssue } from "@/domain/transactions/transaction.type";
import { formatFixedDecimal, formatTrimmedDecimal } from "@/utils/number-format.utils";
import { parseDecimalInput } from "@/utils/number-parse.utils";
import { DERIVED_AMOUNT_DECIMALS, DERIVED_SHARES_DECIMALS } from "./transaction-form.constants";
import { TRANSACTION_FORM_MESSAGES, TRANSACTION_VALIDATION_MESSAGES } from "./transaction-messages.constants";
import type { ActivePortfolio, PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import type {
  PositionSizeDisplay,
  PositionSizeField,
  TransactionFieldErrors,
  TransactionFormValues,
  TransactionInputResult,
} from "./transaction-form.type";

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

// Exact share count for the form: typed shares, or amount ÷ price (NaN when it cannot be computed yet).
export function quantityFromFormValues(values: TransactionFormValues): number {
  const size = parseDecimalInput(values.sizeText);
  if (values.sizeField === "quantity") return size;
  const price = parseDecimalInput(values.price);
  return isPositiveNumber(size) && isPositiveNumber(price) ? calculateQuantityFromAmount(size, price) : Number.NaN;
}

// The input the user did not edit shows a calculated value, or stays empty until price and the other value are valid.
export function positionSizeDisplay(values: TransactionFormValues): PositionSizeDisplay {
  if (values.sizeField === "quantity") {
    const quantity = parseDecimalInput(values.sizeText);
    const price = parseDecimalInput(values.price);
    const amount =
      isPositiveNumber(quantity) && isPositiveNumber(price) ? calculateTotalAmount(quantity, price) : Number.NaN;
    return {
      quantity: values.sizeText,
      amount: isPositiveNumber(amount) ? formatFixedDecimal(amount, DERIVED_AMOUNT_DECIMALS) : "",
    };
  }

  const quantity = quantityFromFormValues(values);
  return {
    quantity: isPositiveNumber(quantity) ? formatTrimmedDecimal(quantity, DERIVED_SHARES_DECIMALS) : "",
    amount: values.sizeText,
  };
}

// Server and domain issues speak about `quantity`; when the user typed an amount, show it on that input.
export function fieldErrorsFromIssues(
  issues: readonly ValidationIssue[],
  sizeField: PositionSizeField = "quantity",
): TransactionFieldErrors {
  const errors: TransactionFieldErrors = {};
  for (const { field, code } of issues) {
    errors[field] ??= TRANSACTION_VALIDATION_MESSAGES[code];
  }
  if (sizeField === "amount" && errors.quantity) {
    delete errors.quantity;
    errors.amount = TRANSACTION_FORM_MESSAGES.INVALID_AMOUNT;
  }
  return errors;
}

// Same domain validation the server runs, so the form reports problems before a round trip.
export function buildTransactionInput(values: TransactionFormValues, today: string): TransactionInputResult {
  const result = validateTransactionInput(
    {
      portfolioId: values.portfolioId,
      ticker: values.ticker,
      type: values.type,
      date: values.date,
      quantity: quantityFromFormValues(values),
      price: parseDecimalInput(values.price),
    },
    today,
  );
  if (result.ok) return { ok: true, input: result.value };

  const fieldErrors = fieldErrorsFromIssues(result.issues, values.sizeField);
  // A valid amount only fails because the price is missing or invalid; flag the price alone.
  if (values.sizeField === "amount" && fieldErrors.price && isPositiveNumber(parseDecimalInput(values.sizeText))) {
    delete fieldErrors.amount;
  }
  return { ok: false, fieldErrors };
}

// The active portfolio, or the only one there is; otherwise the user has to choose.
export function defaultFormPortfolioId(active: ActivePortfolio, portfolios: readonly PortfolioOption[]): string {
  if (active.kind === "portfolio") return active.portfolio.id;
  return portfolios.length === 1 ? portfolios[0].id : "";
}

// A portfolio deleted while the form is open is treated as not chosen, so the select and the submit agree.
export function availablePortfolioId(portfolioId: string, portfolios: readonly PortfolioOption[]): string {
  return portfolios.some((portfolio) => portfolio.id === portfolioId) ? portfolioId : "";
}
