import { NOT_AVAILABLE_LABEL } from "@/constants/format.constants";
import type { Holding } from "@/domain/portfolio/portfolio.type";
import { tickerTransactionsHref } from "@/features/transactions/transaction-list-query.utils";
import type { SignedCell, SignedLabel } from "@/types/display-sign.type";
import { formatCurrency, formatShares, signedCurrencyLabel, signedPercentLabel } from "@/utils/number-format.utils";
import { compareValues, sortedTableCaption } from "@/utils/sort.utils";
import { HOLDING_ACTION_LABELS, HOLDING_COLUMN_LABELS } from "./holdings-table.constants";
import type { HoldingRow, HoldingSort } from "./holdings-table.type";

// A total order, because tickers are unique after combinePositions.
function compareHoldings(a: Holding, b: Holding, sort: HoldingSort): number {
  const valueA = a[sort.key];
  const valueB = b[sort.key];
  if (valueA === null || valueB === null) {
    // Missing values go last in both directions.
    if (valueA !== valueB) return valueA === null ? 1 : -1;
  } else {
    // Raw values, never rounded ones.
    const primary = (sort.dir === "asc" ? 1 : -1) * compareValues(valueA, valueB);
    if (primary !== 0) return primary;
  }
  // Ties go to ticker A→Z in both directions.
  return compareValues(a.ticker, b.ticker);
}

// Copy, never mutates. Raw values; missing values last and ticker A→Z ties, both in both directions.
export function sortHoldings(holdings: readonly Holding[], sort: HoldingSort): Holding[] {
  return [...holdings].sort((a, b) => compareHoldings(a, b, sort));
}

function priceLabel(value: number | null): string {
  return value === null ? NOT_AVAILABLE_LABEL : formatCurrency(value);
}

function signedCell(value: number | null, toLabel: (value: number) => SignedLabel): SignedCell {
  return value === null ? { label: NOT_AVAILABLE_LABEL, sign: null } : toLabel(value);
}

// Keeps input order.
export function toHoldingRows(holdings: readonly Holding[]): HoldingRow[] {
  return holdings.map((holding) => ({
    ticker: holding.ticker,
    sharesLabel: formatShares(holding.shares),
    averageCostLabel: formatCurrency(holding.averageCost),
    hasPrice: holding.currentPrice !== null,
    currentPriceLabel: priceLabel(holding.currentPrice),
    marketValueLabel: priceLabel(holding.marketValue),
    // Each cell takes the sign of its own rounded text.
    gainLoss: signedCell(holding.gainLoss, signedCurrencyLabel),
    // Can be null next to a price (nothing invested), and then shows the dash.
    returnPercentage: signedCell(holding.returnPercentage, signedPercentLabel),
    viewTransactionsHref: tickerTransactionsHref(holding.ticker),
    actionsId: `holding-${encodeURIComponent(holding.ticker)}`,
    actionsLabel: `${HOLDING_ACTION_LABELS.TRIGGER_PREFIX} ${holding.ticker}`,
    // Visible label first (WCAG 2.5.3), like the transactions table's "Edit …" and "Delete …".
    viewTransactionsLabel: `${HOLDING_ACTION_LABELS.VIEW_TRANSACTIONS} for ${holding.ticker}`,
  }));
}

// "Holdings in all portfolios, sorted by Ticker ascending".
export function holdingsCaption(scopeLabel: string, sort: HoldingSort): string {
  return sortedTableCaption("Holdings", scopeLabel, HOLDING_COLUMN_LABELS[sort.key], sort.dir);
}
