import { useMemo } from "react";
import { useTransactions } from "@/features/transactions/hooks/use-transactions.hook";
import { ALL_PORTFOLIOS_SCOPE } from "../active-portfolio.constants";
import { countTransactionsByPortfolio } from "../portfolio-list.utils";
import type { PortfolioOption } from "../portfolio-selection.type";
import { usePortfolios } from "./use-portfolios.hook";

type ManagePortfoliosState =
  | { status: "loading" }
  | { status: "ready"; portfolios: PortfolioOption[]; transactionCounts: ReadonlyMap<string, number> };

export function useManagePortfolios(): ManagePortfoliosState {
  const portfolios = usePortfolios();
  const { transactions } = useTransactions(ALL_PORTFOLIOS_SCOPE);
  const transactionCounts = useMemo(
    () => (transactions === undefined ? undefined : countTransactionsByPortfolio(transactions)),
    [transactions],
  );

  if (portfolios === undefined || transactionCounts === undefined) return { status: "loading" };
  return { status: "ready", portfolios, transactionCounts };
}
