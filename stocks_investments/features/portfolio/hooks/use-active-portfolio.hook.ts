import { useSyncExternalStore } from "react";
import { activePortfolioStorage } from "../active-portfolio-storage.service";
import { activePortfolioValue, resolveActivePortfolio, scopeOfActivePortfolio } from "../active-portfolio.utils";
import type { ActivePortfolioState } from "../portfolio-selection.type";
import { usePortfolios } from "./use-portfolios.hook";

function select(value: string) {
  activePortfolioStorage.set(value);
}

// Shared by every screen: changing the selector in the sidebar re-renders all of them.
export function useActivePortfolio(): ActivePortfolioState {
  const portfolios = usePortfolios();
  const storedValue = useSyncExternalStore(
    activePortfolioStorage.subscribe,
    activePortfolioStorage.getSnapshot,
    activePortfolioStorage.getServerSnapshot,
  );

  if (portfolios === undefined || storedValue === undefined) return { status: "loading", select };

  const active = resolveActivePortfolio(portfolios, storedValue);
  return {
    status: "ready",
    portfolios,
    active,
    scope: scopeOfActivePortfolio(active),
    selectedValue: activePortfolioValue(active),
    select,
  };
}
