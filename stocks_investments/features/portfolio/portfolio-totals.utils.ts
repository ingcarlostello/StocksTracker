import { NOT_AVAILABLE_LABEL } from "@/constants/format.constants";
import type { PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import { formatCurrency, signedCurrencyLabel, signedPercentLabel } from "@/utils/number-format.utils";
import { PORTFOLIO_VIEW_MESSAGES } from "./portfolio-messages.constants";
import type { PortfolioTotalsModel } from "./portfolio-totals.type";

function withheldTotalsNote(summary: PortfolioSummary, prices: Pick<PricesState, "isPending" | "isFetching">): string {
  if (prices.isPending || prices.isFetching) return PORTFOLIO_VIEW_MESSAGES.TOTALS_WAITING_FOR_PRICES;
  // missingPriceTickers order (A→Z from combinePositions), not the display sort.
  return `No price for ${summary.missingPriceTickers.join(", ")}, so Market Value and Total Gain / Loss can't be totaled.`;
}

// Formatted from the exact sums, never from rounded rows, so displayed rows may differ from the totals by cents.
// Prices count as loading while isPending || isFetching (placeholder data and paused offline queries).
export function toPortfolioTotals(
  summary: PortfolioSummary,
  prices: Pick<PricesState, "isPending" | "isFetching">,
): PortfolioTotalsModel {
  const { portfolioValue, totalInvested, totalGainLoss, portfolioReturn } = summary;
  return {
    isComplete: portfolioValue !== null,
    marketValueLabel: portfolioValue === null ? NOT_AVAILABLE_LABEL : formatCurrency(portfolioValue),
    totalInvestedLabel: formatCurrency(totalInvested),
    gainLoss: totalGainLoss === null ? { label: NOT_AVAILABLE_LABEL, sign: null } : signedCurrencyLabel(totalGainLoss),
    returnPercentage: portfolioReturn === null ? null : signedPercentLabel(portfolioReturn),
    note: portfolioValue !== null ? null : withheldTotalsNote(summary, prices),
  };
}
