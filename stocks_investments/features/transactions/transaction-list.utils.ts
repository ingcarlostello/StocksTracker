import { DISPLAY_LOCALE } from "@/constants/format.constants";
import { compareTransactions } from "@/domain/transactions/transaction-order.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { formatIsoDate } from "@/utils/date-format.utils";
import { isIsoDate } from "@/utils/date.utils";
import { formatCurrency, formatShares, formatSharesExact } from "@/utils/number-format.utils";
import { TRANSACTION_TYPE_LABELS } from "./transaction-form.constants";
import { dateRangeError, editTransactionHref } from "./transaction-list-query.utils";
import { SORT_DIRECTION_LABELS, TRANSACTION_COLUMN_LABELS, UNKNOWN_PORTFOLIO_NAME } from "./transaction-list.constants";
import type {
  EffectiveSort,
  TransactionListQuery,
  TransactionRow,
  TransactionSortKey,
  TransactionSummary,
} from "./transaction-list.type";

const portfolioNameCollator = new Intl.Collator(DISPLAY_LOCALE, { sensitivity: "base", numeric: true });
// Names unique only after lowercasing ("Cafe" and "Café") compare equal above; this keeps each portfolio's rows together.
const portfolioNameTiebreakCollator = new Intl.Collator(DISPLAY_LOCALE, { sensitivity: "variant", numeric: true });

function comparePortfolios(nameA: string, nameB: string, idA: string, idB: string): number {
  return (
    portfolioNameCollator.compare(nameA, nameB) ||
    portfolioNameTiebreakCollator.compare(nameA, nameB) ||
    compareValues(idA, idB)
  );
}

function isWithinDateRange(date: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  // Rows edited outside the app may hold a non-ISO date, which no bound can place.
  if (!isIsoDate(date)) return false;
  return (!from || date >= from) && (!to || date <= to);
}

// Expects an applied (normalized) query.
export function filterTransactions<T extends TransactionLike>(transactions: readonly T[], query: TransactionListQuery): T[] {
  if (dateRangeError(query)) return [];
  return transactions.filter(
    (transaction) =>
      (!query.ticker || transaction.ticker.startsWith(query.ticker)) &&
      (query.type === "all" || transaction.type === (query.type === "buy" ? "BUY" : "SELL")) &&
      isWithinDateRange(transaction.date, query.from, query.to),
  );
}

function compareValues(a: number | string, b: number | string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Ascending comparison by a non-date key; 0 on a tie.
function compareByKey(a: TransactionLike, b: TransactionLike, key: Exclude<TransactionSortKey, "date" | "portfolio">): number {
  switch (key) {
    case "type":
      return compareValues(a.type, b.type);
    case "ticker":
      return compareValues(a.ticker, b.ticker);
    case "shares":
      return compareValues(a.quantity, b.quantity);
    case "price":
      return compareValues(a.price, b.price);
    case "total":
      return compareValues(a.totalAmount, b.totalAmount);
  }
}

// Always a total order, so ties never reshuffle: raw values first, then newest first in canonical order.
export function sortTransactionList<T extends TransactionLike>(
  transactions: readonly T[],
  sort: EffectiveSort,
  portfolioNames: ReadonlyMap<string, string>,
): T[] {
  const direction = sort.dir === "asc" ? 1 : -1;

  return [...transactions].sort((a, b) => {
    if (sort.key === "date") return direction * compareTransactions(a, b);

    let primary: number;
    if (sort.key === "portfolio") {
      const nameA = portfolioNames.get(a.portfolioId);
      const nameB = portfolioNames.get(b.portfolioId);
      // Portfolios that are not loaded go last in both directions.
      if (nameA === undefined || nameB === undefined) {
        if (nameA !== nameB) return nameA === undefined ? 1 : -1;
        primary = 0;
      } else {
        primary = direction * comparePortfolios(nameA, nameB, a.portfolioId, b.portfolioId);
      }
    } else {
      primary = direction * compareByKey(a, b, sort.key);
    }

    return primary !== 0 ? primary : -compareTransactions(a, b);
  });
}

type TransactionRowOptions = {
  showPortfolioColumn: boolean;
  portfolioNames: ReadonlyMap<string, string>;
  // Current list query, carried to the edit page so Cancel and Save come back to the same view.
  listQueryString: string;
};

export function toTransactionRows(
  transactions: readonly TransactionLike[],
  { showPortfolioColumn, portfolioNames, listQueryString }: TransactionRowOptions,
): TransactionRow[] {
  return transactions.map((transaction) => {
    const typeLabel = TRANSACTION_TYPE_LABELS[transaction.type];
    const sharesLabel = formatShares(transaction.quantity);
    const dateLabel = formatIsoDate(transaction.date);
    const knownPortfolioName = showPortfolioColumn ? portfolioNames.get(transaction.portfolioId) : undefined;
    return {
      id: transaction.id,
      type: transaction.type,
      dateLabel,
      ticker: transaction.ticker,
      portfolioName: showPortfolioColumn ? (knownPortfolioName ?? UNKNOWN_PORTFOLIO_NAME) : null,
      sharesLabel,
      priceLabel: formatCurrency(transaction.price),
      totalLabel: formatCurrency(transaction.totalAmount),
      // An unknown portfolio is left out rather than read aloud as "in —".
      description: `${typeLabel} ${sharesLabel} ${transaction.ticker} on ${dateLabel}${knownPortfolioName ? ` in ${knownPortfolioName}` : ""}`,
      editHref: editTransactionHref(transaction.id, listQueryString),
      actionsId: `transaction-${transaction.id}`,
    };
  });
}

// Exact share count: the delete dialog must not hide a difference the table rounds away.
export function transactionSummary(
  transaction: TransactionLike,
  portfolioNames: ReadonlyMap<string, string>,
): TransactionSummary {
  return {
    type: transaction.type,
    ticker: transaction.ticker,
    sharesLabel: formatSharesExact(transaction.quantity),
    priceLabel: formatCurrency(transaction.price),
    totalLabel: formatCurrency(transaction.totalAmount),
    dateLabel: formatIsoDate(transaction.date),
    portfolioName: portfolioNames.get(transaction.portfolioId) ?? UNKNOWN_PORTFOLIO_NAME,
  };
}

export function listSummary(visibleCount: number, totalCount: number): string {
  return `Showing ${visibleCount} of ${totalCount} ${totalCount === 1 ? "transaction" : "transactions"}`;
}

export function scopeCaption(scopeLabel: string, sort: EffectiveSort): string {
  return `Transactions in ${scopeLabel}, sorted by ${TRANSACTION_COLUMN_LABELS[sort.key]} ${SORT_DIRECTION_LABELS[sort.dir]}`;
}
