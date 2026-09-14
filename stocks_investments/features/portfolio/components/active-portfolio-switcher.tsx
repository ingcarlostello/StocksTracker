"use client";

import { useMemo } from "react";
import { ROUTES } from "@/constants/routes.constants";
import { useActivePortfolio } from "../hooks/use-active-portfolio.hook";
import { activePortfolioSelectOptions } from "../portfolio-options.utils";
import { PortfolioSwitcher } from "./portfolio-switcher";

const NO_PORTFOLIOS = [] as const;

export function ActivePortfolioSwitcher() {
  const activePortfolio = useActivePortfolio();
  const portfolios = activePortfolio.status === "ready" ? activePortfolio.portfolios : NO_PORTFOLIOS;
  const options = useMemo(() => activePortfolioSelectOptions(portfolios), [portfolios]);

  if (activePortfolio.status === "loading") return <PortfolioSwitcher status="loading" />;
  if (portfolios.length === 0) return <PortfolioSwitcher status="empty" manageHref={ROUTES.PORTFOLIOS} />;
  return (
    <PortfolioSwitcher
      status="ready"
      options={options}
      value={activePortfolio.selectedValue}
      manageHref={ROUTES.PORTFOLIOS}
      onChange={activePortfolio.select}
    />
  );
}
