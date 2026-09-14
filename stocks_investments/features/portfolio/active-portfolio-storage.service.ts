import { createLocalStorageStore } from "@/adapters/browser-storage/local-storage-store.adapter";
import { ACTIVE_PORTFOLIO_STORAGE_KEY } from "./active-portfolio.constants";

// The active portfolio is a per-browser preference, so it lives in local storage rather than in Convex.
export const activePortfolioStorage = createLocalStorageStore(ACTIVE_PORTFOLIO_STORAGE_KEY);
