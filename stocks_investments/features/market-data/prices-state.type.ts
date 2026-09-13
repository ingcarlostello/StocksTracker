import type { PriceMap } from "@/domain/portfolio/portfolio.type";

export type PricesState = {
  prices: PriceMap;
  // Trading day of the closes, or null before the first successful response.
  asOfDate: string | null;
  missing: string[];
  isPending: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  // Epoch ms of the last successful response.
  lastUpdatedAt: number | null;
  canRefresh: boolean;
  refresh: () => void;
};
