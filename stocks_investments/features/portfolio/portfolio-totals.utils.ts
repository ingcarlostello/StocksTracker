import { NOT_AVAILABLE_LABEL } from "@/constants/format.constants";
import type { PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import { formatCurrency, signedCurrencyLabel, signedPercentLabel } from "@/utils/number-format.utils";
import { PORTFOLIO_VIEW_MESSAGES } from "./portfolio-messages.constants";
import type { PortfolioTotalsModel, WithheldTotalsReason } from "./portfolio-totals.type";

// null when nothing is withheld (portfolioValue !== null). Otherwise waiting while isPending || isFetching
// (placeholder data, paused offline query), else the unpriced tickers in missingPriceTickers order (A→Z from
// combinePositions, not the display sort).
export function withheldTotalsReason(
  summary: PortfolioSummary,
  prices: Pick<PricesState, "isPending" | "isFetching">,
): WithheldTotalsReason | null {
  if (summary.portfolioValue !== null) return null;
  if (prices.isPending || prices.isFetching) return { kind: "waiting-for-prices" };
  return { kind: "missing-prices", tickers: summary.missingPriceTickers };
}

function portfolioTotalsNote(reason: WithheldTotalsReason | null): string | null {
  if (reason === null) return null;
  if (reason.kind === "waiting-for-prices") return PORTFOLIO_VIEW_MESSAGES.TOTALS_WAITING_FOR_PRICES;
  return `No price for ${reason.tickers.join(", ")}, so Market Value and Total Gain / Loss can't be totaled.`;
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
    note: portfolioTotalsNote(withheldTotalsReason(summary, prices)),
  };
}
