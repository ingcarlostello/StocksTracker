import { useCallback, useMemo, useState } from "react";
import { performanceYears } from "@/domain/performance/annual-valuation.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { activePortfolioScopeLabel } from "@/features/portfolio/active-portfolio.utils";
import { usePortfolioHistory } from "@/features/portfolio/hooks/use-portfolio-history.hook";
import { useMarketToday } from "@/hooks/use-market-today.hook";
import { yearOfIsoDate } from "@/utils/date.utils";
import type { PerformanceViewState } from "../performance.type";
import { buildPerformanceView } from "../performance-view.utils";
import { resolveSelectedYear } from "../performance-year.utils";
import { useAnnualPerformance } from "./use-annual-performance.hook";

const NO_TRANSACTIONS: TransactionLike[] = [];

// Everything the /performance page renders, for the portfolio chosen in the sidebar.
export function usePerformanceView(): PerformanceViewState {
  const history = usePortfolioHistory();
  const today = useMarketToday();
  // The year the user asked for, kept even while the active scope does not offer it: switching scopes
  // away and back restores it, with no state to synchronise.
  const [requestedYear, setRequestedYear] = useState<number | null>(null);

  const transactions = history.status === "ready" ? history.transactions : NO_TRANSACTIONS;
  const years = useMemo(() => performanceYears(transactions, yearOfIsoDate(today)), [transactions, today]);
  const selectedYear = resolveSelectedYear(requestedYear, years);

  const annual = useAnnualPerformance({ transactions, year: selectedYear, today });
  const onSelectYear = useCallback((value: string) => {
    setRequestedYear(Number(value));
  }, []);

  return buildPerformanceView({
    history,
    years,
    selectedYear,
    onSelectYear,
    annual,
    scopeLabel: history.status === "ready" ? activePortfolioScopeLabel(history.active) : "",
  });
}
