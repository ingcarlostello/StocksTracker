export const RECENT_TRANSACTIONS_LIMIT = 3;

export const SUMMARY_CARD_LABELS = {
  PORTFOLIO_VALUE: "Portfolio Value",
  TOTAL_INVESTED: "Total Invested",
  TOTAL_GAIN_LOSS: "Total Gain / Loss",
  PORTFOLIO_RETURN: "Portfolio Return",
} as const;

export const DASHBOARD_TEXT = {
  TITLE: "Dashboard",
  SUBTITLE: "Here's an overview of your investments.",
  // Visually hidden heading of the stat cards.
  SUMMARY_TITLE: "Portfolio summary",
  HOLDINGS_TITLE: "Holdings",
  RECENT_TITLE: "Recent Transactions",
  VIEW_ALL: "View all",
  // sr-only suffix → accessible name "View all transactions" (contains the visible text, WCAG 2.5.3).
  VIEW_ALL_SR_SUFFIX: " transactions",
} as const;

export const DASHBOARD_SECTION_IDS = {
  SUMMARY: "dashboard-summary-title",
  HOLDINGS: "dashboard-holdings-title",
  RECENT: "dashboard-recent-transactions-title",
} as const;

export const DASHBOARD_MESSAGES = {
  LOADING: "Loading dashboard…",
} as const;
