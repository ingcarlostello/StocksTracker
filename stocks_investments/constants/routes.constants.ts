export const ROUTES = {
  DASHBOARD: "/dashboard",
  PORTFOLIO: "/portfolio",
  TRANSACTIONS: "/transactions",
  PERFORMANCE: "/performance",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
