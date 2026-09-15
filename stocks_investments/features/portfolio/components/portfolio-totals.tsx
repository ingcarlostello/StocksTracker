import { Card } from "@/components/ui/card";
import { SignedValue } from "@/components/ui/signed-value";
import type { PortfolioTotalsModel } from "../portfolio-totals.type";

type PortfolioTotalsProps = {
  totals: PortfolioTotalsModel;
};

const TITLE_ID = "portfolio-totals-title";

export function PortfolioTotals({ totals }: PortfolioTotalsProps) {
  return (
    <section aria-labelledby={TITLE_ID}>
      <Card>
        <h2 id={TITLE_ID} className="text-sm font-semibold text-foreground">
          Portfolio Totals
        </h2>
        {/* sm:grid-cols-3 only keeps narrow screens readable; the responsive pass is Phase 13. */}
        <dl className="mt-4 grid gap-6 tabular-nums sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Market Value</dt>
            <dd className={`mt-1 text-2xl font-semibold ${totals.isComplete ? "text-foreground" : "text-muted"}`}>
              {totals.marketValueLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total Invested</dt>
            <dd className="mt-1 text-2xl font-semibold text-foreground">{totals.totalInvestedLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total Gain / Loss</dt>
            <dd className="mt-1 text-2xl font-semibold">
              <SignedValue sign={totals.gainLoss.sign}>{totals.gainLoss.label}</SignedValue>
            </dd>
            {totals.returnPercentage ? (
              <dd className="mt-1 text-sm">
                <SignedValue sign={totals.returnPercentage.sign}>{totals.returnPercentage.label}</SignedValue>
              </dd>
            ) : null}
          </div>
        </dl>
        {totals.note ? <p className="mt-4 text-sm text-muted">{totals.note}</p> : null}
      </Card>
    </section>
  );
}
