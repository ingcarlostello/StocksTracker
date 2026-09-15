"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ROUTES } from "@/constants/routes.constants";
import { PriceAlerts } from "@/features/market-data/components/price-alerts";
import { PriceStatusLabel } from "@/features/market-data/components/price-status-label";
import { RefreshPricesButton } from "@/features/market-data/components/refresh-prices-button";
import { HoldingsTable } from "@/features/portfolio/components/holdings-table";
import { NoPortfoliosNotice } from "@/features/portfolio/components/no-portfolios-notice";
import { PORTFOLIO_VIEW_MESSAGES } from "@/features/portfolio/portfolio-messages.constants";
import { DASHBOARD_MESSAGES, DASHBOARD_SECTION_IDS, DASHBOARD_TEXT } from "../dashboard.constants";
import type { DashboardState } from "../dashboard.type";
import { useDashboard } from "../hooks/use-dashboard.hook";
import { DashboardSection } from "./dashboard-section";
import { RecentTransactions } from "./recent-transactions";
import { SummaryCards } from "./summary-cards";

type DashboardContentProps = {
  state: DashboardState;
};

// Everything below the header: one branch per dashboard state.
function DashboardContent({ state }: DashboardContentProps) {
  if (state.status === "loading") {
    return <p className="text-sm text-muted">{DASHBOARD_MESSAGES.LOADING}</p>;
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

  const { priceAlerts, cards, holdings, recent } = state;
  return (
    <>
      <div className="flex flex-col gap-4">
        {priceAlerts ? (
          <div className="flex flex-col gap-2">
            <PriceAlerts errorMessage={priceAlerts.errorMessage} missing={priceAlerts.missing} />
          </div>
        ) : null}
        <SummaryCards cards={cards} />
      </div>
      <DashboardSection titleId={DASHBOARD_SECTION_IDS.HOLDINGS} title={DASHBOARD_TEXT.HOLDINGS_TITLE}>
        {holdings ? (
          <HoldingsTable
            rows={holdings.rows}
            sort={holdings.sort}
            caption={holdings.caption}
            onToggleSort={holdings.toggleSort}
          />
        ) : (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            {PORTFOLIO_VIEW_MESSAGES.NO_HOLDINGS}
          </p>
        )}
      </DashboardSection>
      <RecentTransactions recent={recent} />
    </>
  );
}

// The only client boundary of /dashboard: the price label and Refresh button live in the header actions.
export function DashboardView() {
  const state = useDashboard();
  // null outside ready and while nothing is held: no label and no Refresh button.
  const prices = state.status === "ready" ? state.prices : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={DASHBOARD_TEXT.TITLE}
        subtitle={DASHBOARD_TEXT.SUBTITLE}
        actions={
          prices ? (
            <>
              <PriceStatusLabel
                isPending={prices.isPending}
                asOfDate={prices.asOfDate}
                lastUpdatedAt={prices.lastUpdatedAt}
              />
              <RefreshPricesButton
                isFetching={prices.isFetching}
                canRefresh={prices.canRefresh}
                onRefresh={prices.refresh}
              />
            </>
          ) : undefined
        }
      />
      <DashboardContent state={state} />
    </div>
  );
}
