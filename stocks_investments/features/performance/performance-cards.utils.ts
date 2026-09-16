import type { AnnualPerformance } from "@/domain/performance/performance.type";
import { formatCurrency, signedCurrencyLabel, signedPercentLabel } from "@/utils/number-format.utils";
import { PERFORMANCE_CARD_LABELS, PERFORMANCE_UNAVAILABLE_CELL } from "./performance.constants";
import type { PerformanceCardsModel } from "./performance.type";

// The three mockup cards, pre-formatted. Cash Contributed is neutral on purpose: it is money moved, not
// a result, so a net seller reads "-$4,700.00" without the loss colour.
export function toPerformanceCards(performance: AnnualPerformance): PerformanceCardsModel {
  const { kind, year, totalReturn, cashContributed, investmentPerformance } = performance;

  return {
    totalReturn: {
      label:
        kind === "current"
          ? PERFORMANCE_CARD_LABELS.TOTAL_RETURN_YTD
          : `${PERFORMANCE_CARD_LABELS.TOTAL_RETURN} (${year})`,
      value: totalReturn === null ? PERFORMANCE_UNAVAILABLE_CELL : signedPercentLabel(totalReturn),
      caption: PERFORMANCE_CARD_LABELS.TOTAL_RETURN_CAPTION,
    },
    cashContributed: {
      label: PERFORMANCE_CARD_LABELS.CASH_CONTRIBUTED,
      valueLabel: formatCurrency(cashContributed),
    },
    investmentPerformance: {
      label: PERFORMANCE_CARD_LABELS.INVESTMENT_PERFORMANCE,
      value:
        investmentPerformance === null
          ? PERFORMANCE_UNAVAILABLE_CELL
          : signedCurrencyLabel(investmentPerformance),
      caption: PERFORMANCE_CARD_LABELS.INVESTMENT_PERFORMANCE_CAPTION,
    },
  };
}
