"use client";

import { ROUTES } from "@/constants/routes.constants";
import { NoPortfoliosNotice } from "@/features/portfolio/components/no-portfolios-notice";
import { useTransactionsTable } from "../hooks/use-transactions-table.hook";
import { TransactionFilters } from "./transaction-filters";
import { TransactionsLoading } from "./transactions-loading";
import { TransactionsTableSection } from "./transactions-table-section";

// Reads the URL query (useSearchParams), so the page must render it inside a Suspense boundary.
export function TransactionsView() {
  const { query, state } = useTransactionsTable();

  if (state.status === "loading") return <TransactionsLoading />;
  if (state.status === "no-portfolios") return <NoPortfoliosNotice createHref={ROUTES.PORTFOLIOS} />;

  return (
    <div className="flex flex-col gap-6">
      <TransactionFilters
        ticker={query.draft.ticker}
        type={query.draft.type}
        from={query.draft.from}
        to={query.draft.to}
        dateRangeError={query.dateRangeError}
        hasActiveFilters={query.hasActiveFilters}
        onTickerChange={query.setTicker}
        onTypeChange={query.setType}
        onFromChange={query.setFrom}
        onToChange={query.setTo}
        onClear={query.clearFilters}
      />
      {state.totalCount > 0 ? (
        <p role="status" className="text-sm text-muted">
          {state.summary}
        </p>
      ) : null}
      <TransactionsTableSection
        key={state.scopeKey}
        rows={state.rows}
        transactions={state.transactions}
        portfolios={state.portfolios}
        totalCount={state.totalCount}
        showPortfolioColumn={state.showPortfolioColumn}
        sort={state.sort}
        caption={state.caption}
        listQueryString={query.queryString}
        onToggleSort={query.toggleSort}
        onClearFilters={query.clearFilters}
      />
    </div>
  );
}
