"use client";

import { ROUTES } from "@/constants/routes.constants";
import { PriceStatus } from "@/features/market-data/components/price-status";
import { formatIsoDate } from "@/utils/date-format.utils";
import { formatSharesExact } from "@/utils/number-format.utils";
import { usePortfolio } from "../hooks/use-portfolio.hook";
import { HoldingsPreview } from "./holdings-preview";
import { NoPortfoliosNotice } from "./no-portfolios-notice";

export function PortfolioView() {
  const state = usePortfolio();

  if (state.status === "loading") {
    return <p className="text-sm text-muted">Loading portfolio…</p>;
  }

  if (state.status === "no-portfolios") {
    return <NoPortfoliosNotice createHref={ROUTES.PORTFOLIOS} />;
  }

  if (state.status === "invalid-history") {
    const { ticker, date, available, requested } = state.violation;
    return (
      <p role="alert" className="rounded-lg border border-negative/40 bg-sell-tint p-4 text-sm text-foreground">
        Your history sells {formatSharesExact(requested)} {ticker} on {formatIsoDate(date)}, but only{" "}
        {formatSharesExact(available)} shares were held then. Fix that transaction to see your portfolio.
      </p>
    );
  }

  const { holdings, summary, prices } = state;
  return (
    <div className="flex flex-col gap-6">
      {holdings.length > 0 ? (
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
      ) : null}
      <HoldingsPreview holdings={holdings} summary={summary} />
    </div>
  );
}
