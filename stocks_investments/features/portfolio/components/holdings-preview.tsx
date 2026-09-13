import type { Holding, PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import {
  formatCurrency,
  formatShares,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/utils/number-format.utils";

type HoldingsPreviewProps = {
  holdings: Holding[];
  summary: PortfolioSummary;
};

const NOT_AVAILABLE = "—";

export function HoldingsPreview({ holdings, summary }: HoldingsPreviewProps) {
  if (holdings.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        No holdings yet. Add a transaction to see your portfolio.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {holdings.map((holding) => (
          <li key={holding.ticker} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm tabular-nums">
            <span className="font-semibold text-foreground">{holding.ticker}</span>
            <span className="text-muted">{formatShares(holding.shares)} shares</span>
            <span className="text-muted">
              {holding.currentPrice === null ? NOT_AVAILABLE : formatCurrency(holding.currentPrice)}
            </span>
            <span className="text-foreground">
              {holding.marketValue === null ? NOT_AVAILABLE : formatCurrency(holding.marketValue)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-surface p-4 text-sm tabular-nums">
        <div>
          <dt className="text-muted">Market Value</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">
            {summary.portfolioValue === null ? NOT_AVAILABLE : formatCurrency(summary.portfolioValue)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Total Invested</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(summary.totalInvested)}</dd>
        </div>
        <div>
          <dt className="text-muted">Total Gain / Loss</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">
            {summary.totalGainLoss === null ? NOT_AVAILABLE : formatSignedCurrency(summary.totalGainLoss)}
            {summary.portfolioReturn === null ? null : (
              <span className="ml-2 text-sm font-normal text-muted">{formatSignedPercent(summary.portfolioReturn)}</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
