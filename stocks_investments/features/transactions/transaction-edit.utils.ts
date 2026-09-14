import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { isSameStoredTransaction } from "@/domain/transactions/transaction.utils";
import { portfolioNamesById } from "@/features/portfolio/portfolio-list.utils";
import type { PortfolioOption, PortfolioScope } from "@/features/portfolio/portfolio-selection.type";
import { formatExactDecimal, formatFixedDecimal } from "@/utils/number-format.utils";
import {
  DERIVED_AMOUNT_DECIMALS,
  EDIT_SHARES_DRIVER_MAX_DECIMALS,
  EMPTY_TRANSACTION_FORM_VALUES,
  PRICE_TEXT_MIN_DECIMALS,
} from "./transaction-form.constants";
import type { EditNoticeKind } from "./transaction-edit.type";
import type { TransactionFormValues } from "./transaction-form.type";
import { quantityFromFormValues } from "./transaction-form.utils";

function fractionDigits(decimalText: string): number {
  const dot = decimalText.indexOf(".");
  return dot === -1 ? 0 : decimalText.length - dot - 1;
}

// Reopens a trade with the input that reproduces its stored quantity exactly: short share counts as typed,
// otherwise the amount when amount ÷ price is proven to give the same double back, otherwise the exact shares.
export function chooseEditSizeDriver(
  transaction: Pick<TransactionLike, "quantity" | "price" | "totalAmount">,
  priceText: string,
): Pick<TransactionFormValues, "sizeField" | "sizeText"> {
  const sharesText = formatExactDecimal(transaction.quantity);
  if (fractionDigits(sharesText) <= EDIT_SHARES_DRIVER_MAX_DECIMALS) {
    return { sizeField: "quantity", sizeText: sharesText };
  }

  const amountText = formatFixedDecimal(transaction.totalAmount, DERIVED_AMOUNT_DECIMALS);
  const quantityFromAmount = quantityFromFormValues({
    ...EMPTY_TRANSACTION_FORM_VALUES,
    price: priceText,
    sizeField: "amount",
    sizeText: amountText,
  });
  if (quantityFromAmount === transaction.quantity) return { sizeField: "amount", sizeText: amountText };

  return { sizeField: "quantity", sizeText: sharesText };
}

// Every text parses back to the stored doubles, so fields the user does not touch keep their exact numbers.
export function editFormValuesFromTransaction(transaction: TransactionLike): TransactionFormValues {
  const price = formatExactDecimal(transaction.price, PRICE_TEXT_MIN_DECIMALS);
  return {
    portfolioId: transaction.portfolioId,
    type: transaction.type,
    ticker: transaction.ticker,
    date: transaction.date,
    price,
    ...chooseEditSizeDriver(transaction, price),
  };
}

// Compares the version the form was opened with against the live one; only meaningful while editing.
export function editNotice(
  baseline: TransactionLike,
  current: TransactionLike | undefined,
  serverDeleted: boolean,
): EditNoticeKind | null {
  if (serverDeleted || !current) return "deleted";
  return isSameStoredTransaction(baseline, current) ? null : "changed";
}

// Warns before saving that the trade will leave the portfolio the list is showing.
export function movedOutOfScopeHint(
  scope: PortfolioScope,
  chosenPortfolioId: string,
  portfolios: readonly PortfolioOption[],
): string | undefined {
  if (scope.kind !== "portfolio" || chosenPortfolioId === "" || chosenPortfolioId === scope.portfolioId) return undefined;
  const names = portfolioNamesById(portfolios);
  const chosenName = names.get(chosenPortfolioId);
  const scopeName = names.get(scope.portfolioId);
  if (chosenName === undefined || scopeName === undefined) return undefined;
  return `After saving, this transaction moves to ${chosenName} and won't be listed while ${scopeName} is selected.`;
}
