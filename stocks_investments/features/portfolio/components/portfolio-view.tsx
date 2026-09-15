"use client";

import { ROUTES } from "@/constants/routes.constants";
import { PriceStatus } from "@/features/market-data/components/price-status";
import { usePortfolioView } from "../hooks/use-portfolio-view.hook";
import { PORTFOLIO_VIEW_MESSAGES } from "../portfolio-messages.constants";
import { HoldingsTable } from "./holdings-table";
import { NoPortfoliosNotice } from "./no-portfolios-notice";
import { PortfolioTotals } from "./portfolio-totals";

export function PortfolioView() {
  const state = usePortfolioView();

  if (state.status === "loading") {
    return <p className="text-sm text-muted">{PORTFOLIO_VIEW_MESSAGES.LOADING}</p>;
  }

  if (state.status === "no-portfolios") {
    return <NoPortfoliosNotice createHref={ROUTES.PORTFOLIOS} />;
  }

  if (state.status === "invalid-history") {
    return (
      <p role="alert" className="rounded-lg border border-negative/40 bg-sell-tint p-4 text-sm text-foreground">
        {state.message}
      </p>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        {PORTFOLIO_VIEW_MESSAGES.NO_HOLDINGS}
      </p>
    );
  }

  const { prices, table, totals } = state;
  return (
    <div className="flex flex-col gap-6">
      <PriceStatus
        asOfDate={prices.asOfDate}
        lastUpdatedAt={prices.lastUpdatedAt}
        missing={prices.missing}
        isPending={prices.isPending}
        isFetching={prices.isFetching}
        errorMessage={prices.errorMessage}
        canRefresh={prices.canRefresh}
        onRefresh={prices.refresh}
      />
      <HoldingsTable rows={table.rows} sort={table.sort} caption={table.caption} onToggleSort={table.toggleSort} />
      <PortfolioTotals totals={totals} />
    </div>
  );
}
