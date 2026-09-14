import type { SelectOption } from "@/components/ui/select-field";
import { ALL_PORTFOLIOS_LABEL, ALL_PORTFOLIOS_VALUE } from "./active-portfolio.constants";
import type { PortfolioOption } from "./portfolio-selection.type";

export function portfolioSelectOptions(portfolios: readonly PortfolioOption[]): SelectOption[] {
  return portfolios.map((portfolio) => ({ value: portfolio.id, label: portfolio.name }));
}

// The sidebar selector also offers the combined view first.
export function activePortfolioSelectOptions(portfolios: readonly PortfolioOption[]): SelectOption[] {
  return [{ value: ALL_PORTFOLIOS_VALUE, label: ALL_PORTFOLIOS_LABEL }, ...portfolioSelectOptions(portfolios)];
}
