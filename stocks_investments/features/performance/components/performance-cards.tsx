import { SignedValue } from "@/components/ui/signed-value";
import { StatCard } from "@/components/ui/stat-card";
import { PERFORMANCE_SECTION_IDS, PERFORMANCE_TEXT } from "../performance.constants";
import type { PerformanceCardsModel } from "../performance.type";

type PerformanceCardsProps = {
  cards: PerformanceCardsModel;
};

// The mockup's three Performance cards. Cash Contributed carries no sign colour: it is money moved,
// not a result.
export function PerformanceCards({ cards }: PerformanceCardsProps) {
  const { totalReturn, cashContributed, investmentPerformance } = cards;

  return (
    <section aria-labelledby={PERFORMANCE_SECTION_IDS.CARDS} className="flex flex-col gap-3">
      <h2 id={PERFORMANCE_SECTION_IDS.CARDS} className="sr-only">
        {PERFORMANCE_TEXT.CARDS_HEADING}
      </h2>
      {/* 3 across like the mockup, 1 below sm; the responsive pass is Phase 13. */}
      <dl className="grid gap-4 sm:grid-cols-3">
        <StatCard label={totalReturn.label} caption={totalReturn.caption}>
          <SignedValue sign={totalReturn.value.sign}>{totalReturn.value.label}</SignedValue>
        </StatCard>
        <StatCard label={cashContributed.label}>{cashContributed.valueLabel}</StatCard>
        <StatCard label={investmentPerformance.label} caption={investmentPerformance.caption}>
          <SignedValue sign={investmentPerformance.value.sign}>{investmentPerformance.value.label}</SignedValue>
        </StatCard>
      </dl>
    </section>
  );
}
