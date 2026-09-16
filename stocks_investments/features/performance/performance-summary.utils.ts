import type { AnnualPerformance } from "@/domain/performance/performance.type";
import type { SignedCell } from "@/types/display-sign.type";
import { formatIsoDate } from "@/utils/date-format.utils";
import { isoYearEnd } from "@/utils/date.utils";
import { formatCurrency, signedCurrencyLabel, signedPercentLabel } from "@/utils/number-format.utils";
import { PERFORMANCE_PERIOD_NOTES } from "./performance-messages.constants";
import {
  PERFORMANCE_SUMMARY_LABELS,
  PERFORMANCE_TEXT,
  PERFORMANCE_UNAVAILABLE_CELL,
} from "./performance.constants";
import type { PerformanceSummaryModel, PerformanceSummaryRow } from "./performance.type";

// "Jan 1, 2025 – Dec 31, 2025". Shared with the closed-out note, which reports the same span.
export function performanceDateRangeLabel(start: string, lastDay: string): string {
  return `${formatIsoDate(start)} – ${formatIsoDate(lastDay)}`;
}

// The zero-length period of a year that has nothing to measure yet has no last day; the calendar year
// end then stands in, so the line still reads as a year.
function displayedLastDay(performance: AnnualPerformance): string {
  return performance.period.lastDay ?? isoYearEnd(performance.year);
}

// Money that is neither a gain nor a loss: shown with its own sign but never coloured.
function amountCell(value: number | null): SignedCell {
  return value === null ? PERFORMANCE_UNAVAILABLE_CELL : { label: formatCurrency(value), sign: "zero" };
}

// Every screen since Phase 8.5 names its scope, and this card is where /performance carries it.
export function performancePeriodLabel(performance: AnnualPerformance, scopeLabel: string): string {
  return `${performanceDateRangeLabel(performance.period.start, displayedLastDay(performance))} · ${scopeLabel}`;
}

// Why the measured period is not the plain calendar year. A closed-out current year keeps "in progress":
// the year itself has not ended, and a new buy would extend the period again.
function performancePeriodNote(performance: AnnualPerformance): string | null {
  const fragments: string[] = [];
  if (performance.period.isRebasedStart) fragments.push(PERFORMANCE_PERIOD_NOTES.REBASED_START);
  if (performance.period.isInProgress) fragments.push(PERFORMANCE_PERIOD_NOTES.IN_PROGRESS);
  if (performance.status === "awaiting-first-close") fragments.push(PERFORMANCE_PERIOD_NOTES.NOTHING_MEASURED);
  return fragments.length === 0 ? null : fragments.join(" · ");
}

// The closes the values actually came from, which are not always the period's own dates (Dec 31 on a
// weekend). null when no boundary was valued at all.
export function performanceValuationLabel(performance: AnnualPerformance): string | null {
  const { beginValuationDate, endValuationDate } = performance;
  if (beginValuationDate !== null && endValuationDate !== null) {
    return `Valued at the closes of ${formatIsoDate(beginValuationDate)} and ${formatIsoDate(endValuationDate)}.`;
  }
  const onlyDate = beginValuationDate ?? endValuationDate;
  return onlyDate === null ? null : `Valued at the ${formatIsoDate(onlyDate)} close.`;
}

export function toPerformanceSummary(
  performance: AnnualPerformance,
  scopeLabel: string,
): PerformanceSummaryModel {
  const { period, beginValue, endValue, cashContributed, investmentPerformance, totalReturn } = performance;
  const labels = PERFORMANCE_SUMMARY_LABELS;

  const rows: PerformanceSummaryRow[] = [
    { label: `${labels.STARTING_VALUE} (${formatIsoDate(period.start)})`, value: amountCell(beginValue) },
    { label: labels.CASH_CONTRIBUTED, value: amountCell(cashContributed) },
    {
      label: `${labels.ENDING_VALUE} (${formatIsoDate(displayedLastDay(performance))})`,
      value: amountCell(endValue),
    },
    {
      label: labels.INVESTMENT_PERFORMANCE,
      value:
        investmentPerformance === null
          ? PERFORMANCE_UNAVAILABLE_CELL
          : signedCurrencyLabel(investmentPerformance),
    },
    {
      label: labels.TOTAL_RETURN,
      value: totalReturn === null ? PERFORMANCE_UNAVAILABLE_CELL : signedPercentLabel(totalReturn),
    },
  ];

  return {
    title: PERFORMANCE_TEXT.SUMMARY_TITLE,
    periodLabel: performancePeriodLabel(performance, scopeLabel),
    periodNote: performancePeriodNote(performance),
    valuationLabel: performanceValuationLabel(performance),
    rows,
    footnote: PERFORMANCE_TEXT.SUMMARY_FOOTNOTE,
  };
}
