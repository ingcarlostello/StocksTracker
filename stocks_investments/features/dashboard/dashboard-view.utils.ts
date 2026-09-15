import { ROUTES } from "@/constants/routes.constants";
import { activePortfolioScopeLabel } from "@/features/portfolio/active-portfolio.utils";
import { portfolioNamesById } from "@/features/portfolio/portfolio-list.utils";
import { blockedPortfolioView } from "@/features/portfolio/portfolio-view.utils";
import type { DashboardState, DashboardViewInput } from "./dashboard.type";
import { recentTransactionsCaption, toRecentTransactionRows } from "./recent-transactions.utils";
import { toSummaryCards } from "./summary-cards.utils";

// Everything the dashboard renders, from the portfolio screen state; useDashboard only composes hooks around it.
export function buildDashboardView({ portfolio, table, recentTransactions }: DashboardViewInput): DashboardState {
  // Shared with usePortfolioView: same loading / no-portfolios / invalid-history states and message.
  if (portfolio.status !== "ready") return blockedPortfolioView(portfolio);

  const hasHoldings = portfolio.holdings.length > 0;
  const prices = hasHoldings ? portfolio.prices : null;
  const showPortfolioColumn = portfolio.active.kind === "all";

  return {
    status: "ready",
    prices,
    priceAlerts:
      prices !== null && (prices.errorMessage !== null || prices.missing.length > 0)
        ? { errorMessage: prices.errorMessage, missing: prices.missing }
        : null,
    // Always from the real price flags: with nothing held, portfolioValue is 0 and the note is null anyway.
    cards: toSummaryCards(portfolio.summary, portfolio.prices),
    holdings: hasHoldings ? table : null,
    recent: {
      rows: toRecentTransactionRows(recentTransactions, {
        showPortfolioColumn,
        portfolioNames: portfolioNamesById(portfolio.portfolios),
      }),
      showPortfolioColumn,
      caption: recentTransactionsCaption(activePortfolioScopeLabel(portfolio.active)),
      viewAllHref: ROUTES.TRANSACTIONS,
    },
  };
}
