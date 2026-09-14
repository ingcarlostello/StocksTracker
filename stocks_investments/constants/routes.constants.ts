export const ROUTES = {
  DASHBOARD: "/dashboard",
  PORTFOLIO: "/portfolio",
  PORTFOLIOS: "/portfolios",
  TRANSACTIONS: "/transactions",
  ADD_TRANSACTION: "/transactions/new",
  PERFORMANCE: "/performance",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
