import { useMemo } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { activePortfolioScopeLabel } from "@/features/portfolio/active-portfolio.utils";
import { useActivePortfolio } from "@/features/portfolio/hooks/use-active-portfolio.hook";
import { portfolioNamesById } from "@/features/portfolio/portfolio-list.utils";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { effectiveSort } from "../transaction-list-query.utils";
import type { EffectiveSort, TransactionRow, TransactionSortKey } from "../transaction-list.type";
import {
  filterTransactions,
  listSummary,
  scopeCaption,
  sortTransactionList,
  toTransactionRows,
} from "../transaction-list.utils";
import { useTransactionListQuery } from "./use-transaction-list-query.hook";
import { useTransactions } from "./use-transactions.hook";

type TransactionsTableState =
  | { status: "loading" }
  | { status: "no-portfolios" }
  | {
      status: "ready";
      // "all" or the active portfolio id; remounts per-scope state such as an open delete dialog.
      scopeKey: string;
      caption: string;
      showPortfolioColumn: boolean;
      sort: EffectiveSort;
      // Every transaction in the scope, unfiltered: delete pre-checks replay whole positions.
      transactions: TransactionLike<Id<"transactions">>[];
      portfolios: PortfolioOption[];
      rows: TransactionRow[];
      totalCount: number;
      summary: string;
    };

const NO_PORTFOLIOS: PortfolioOption[] = [];
const NO_ROWS: TransactionRow[] = [];

// Rows of the active portfolio scope, filtered and sorted by the URL-saved list query.
export function useTransactionsTable() {
  const activePortfolio = useActivePortfolio();
  const isReady = activePortfolio.status === "ready";
  // A scope switch returns undefined until the new scope loads, so old and new rows never mix.
  const { transactions } = useTransactions(isReady ? activePortfolio.scope : "skip");
  const listQuery = useTransactionListQuery();

  const portfolios = isReady ? activePortfolio.portfolios : NO_PORTFOLIOS;
  const showPortfolioColumn = isReady && activePortfolio.active.kind === "all";
  const { applied, queryString } = listQuery;

  const portfolioNames = useMemo(() => portfolioNamesById(portfolios), [portfolios]);
  const sort = useMemo(() => effectiveSort(applied, showPortfolioColumn), [applied, showPortfolioColumn]);
  const rows = useMemo(
    () =>
      transactions === undefined
        ? NO_ROWS
        : toTransactionRows(sortTransactionList(filterTransactions(transactions, applied), sort, portfolioNames), {
            showPortfolioColumn,
            portfolioNames,
            listQueryString: queryString,
          }),
    [transactions, applied, sort, portfolioNames, showPortfolioColumn, queryString],
  );

  const query = {
    ...listQuery,
    // Header clicks toggle from the sort on screen, not from a saved sort whose column is hidden.
    toggleSort: (key: TransactionSortKey) => listQuery.toggleSort(key, sort),
  };

  let state: TransactionsTableState;
  if (!isReady) {
    state = { status: "loading" };
  } else if (activePortfolio.portfolios.length === 0) {
    state = { status: "no-portfolios" };
  } else if (transactions === undefined) {
    state = { status: "loading" };
  } else {
    state = {
      status: "ready",
      scopeKey: activePortfolio.selectedValue,
      caption: scopeCaption(activePortfolioScopeLabel(activePortfolio.active), sort),
      showPortfolioColumn,
      sort,
      transactions,
      portfolios: activePortfolio.portfolios,
      rows,
      totalCount: transactions.length,
      summary: listSummary(rows.length, transactions.length),
    };
  }

  return { query, state };
}
