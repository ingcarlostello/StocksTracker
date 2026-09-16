import { Card } from "@/components/ui/card";
import { SignedValue } from "@/components/ui/signed-value";
import { PERFORMANCE_SECTION_IDS } from "../performance.constants";
import type { PerformanceSummaryModel } from "../performance.type";

type PerformanceSummaryProps = {
  summary: PerformanceSummaryModel;
};

export function PerformanceSummary({ summary }: PerformanceSummaryProps) {
  return (
    <section aria-labelledby={PERFORMANCE_SECTION_IDS.SUMMARY}>
      <Card>
        <h2 id={PERFORMANCE_SECTION_IDS.SUMMARY} className="text-sm font-semibold text-foreground">
          {summary.title}
        </h2>
        <p className="mt-1 text-xs text-muted">{summary.periodLabel}</p>
        {summary.periodNote ? <p className="mt-0.5 text-xs text-muted">{summary.periodNote}</p> : null}
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          {summary.rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-6">
              <dt className="text-muted">{row.label}</dt>
              <dd className="font-medium tabular-nums">
                <SignedValue sign={row.value.sign}>{row.value.label}</SignedValue>
              </dd>
            </div>
          ))}
        </dl>
        {summary.valuationLabel ? <p className="mt-4 text-xs text-muted">{summary.valuationLabel}</p> : null}
        <p className="mt-6 border-t border-border pt-4 text-xs text-muted">{summary.footnote}</p>
      </Card>
    </section>
  );
}
