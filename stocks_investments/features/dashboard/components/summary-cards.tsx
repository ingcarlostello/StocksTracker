import { SignedValue } from "@/components/ui/signed-value";
import { StatCard } from "@/components/ui/stat-card";
import { DASHBOARD_SECTION_IDS, DASHBOARD_TEXT, SUMMARY_CARD_LABELS } from "../dashboard.constants";
import type { SummaryCardsModel } from "../dashboard.type";

type SummaryCardsProps = {
  cards: SummaryCardsModel;
};

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <section aria-labelledby={DASHBOARD_SECTION_IDS.SUMMARY} className="flex flex-col gap-3">
      <h2 id={DASHBOARD_SECTION_IDS.SUMMARY} className="sr-only">
        {DASHBOARD_TEXT.SUMMARY_TITLE}
      </h2>
      {/* 4 across at xl like the mockup, 2 from sm; the responsive pass is Phase 13. */}
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={SUMMARY_CARD_LABELS.PORTFOLIO_VALUE} muted={!cards.portfolioValue.isAvailable}>
          {cards.portfolioValue.label}
        </StatCard>
        <StatCard label={SUMMARY_CARD_LABELS.TOTAL_INVESTED}>{cards.totalInvestedLabel}</StatCard>
        <StatCard label={SUMMARY_CARD_LABELS.TOTAL_GAIN_LOSS}>
          <SignedValue sign={cards.totalGainLoss.sign}>{cards.totalGainLoss.label}</SignedValue>
        </StatCard>
        <StatCard label={SUMMARY_CARD_LABELS.PORTFOLIO_RETURN}>
          <SignedValue sign={cards.portfolioReturn.sign}>{cards.portfolioReturn.label}</SignedValue>
        </StatCard>
      </dl>
      {cards.note ? <p className="text-sm text-muted">{cards.note}</p> : null}
    </section>
  );
}
