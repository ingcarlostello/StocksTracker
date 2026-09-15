import { NOT_AVAILABLE_LABEL } from "@/constants/format.constants";
import type { PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import { PORTFOLIO_VIEW_MESSAGES } from "@/features/portfolio/portfolio-messages.constants";
import type { WithheldTotalsReason } from "@/features/portfolio/portfolio-totals.type";
import { toPortfolioTotals, withheldTotalsReason } from "@/features/portfolio/portfolio-totals.utils";
import type { SummaryCardsModel } from "./dashboard.type";

// Same rule as the /portfolio note (withheldTotalsReason), with the dashboard's card names.
export function summaryCardsNote(reason: WithheldTotalsReason | null): string | null {
  if (reason === null) return null;
  if (reason.kind === "waiting-for-prices") return PORTFOLIO_VIEW_MESSAGES.TOTALS_WAITING_FOR_PRICES;
  return `No price for ${reason.tickers.join(", ")}, so Portfolio Value, Total Gain / Loss and Portfolio Return can't be calculated.`;
}

// Formatted from exact sums (never rounded rows), like /portfolio.
export function toSummaryCards(
  summary: PortfolioSummary,
  prices: Pick<PricesState, "isPending" | "isFetching">,
): SummaryCardsModel {
  const totals = toPortfolioTotals(summary, prices);
  return {
    portfolioValue: { label: totals.marketValueLabel, isAvailable: totals.isComplete },
    totalInvestedLabel: totals.totalInvestedLabel,
    totalGainLoss: totals.gainLoss,
    portfolioReturn: totals.returnPercentage ?? { label: NOT_AVAILABLE_LABEL, sign: null },
    note: summaryCardsNote(withheldTotalsReason(summary, prices)),
  };
}
