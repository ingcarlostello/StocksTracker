import { isPortfolioNameTaken, validatePortfolioName } from "@/domain/portfolio/portfolio-name.service";
import type { PortfolioLike } from "@/domain/portfolio/portfolio.type";
import { PORTFOLIO_ERROR_MESSAGES, PORTFOLIO_NAME_MESSAGES } from "./portfolio-messages.constants";

// Same rules the server applies, so most mistakes are reported without a round trip.
export function portfolioNameError(
  name: string,
  portfolios: readonly PortfolioLike[],
  exceptId?: string,
): string | null {
  const result = validatePortfolioName(name);
  if (!result.ok) return PORTFOLIO_NAME_MESSAGES[result.code];
  if (isPortfolioNameTaken(portfolios, result.name, exceptId)) return PORTFOLIO_ERROR_MESSAGES["duplicate-name"];
  return null;
}

export function transactionCountLabel(count: number): string {
  if (count === 0) return "No transactions";
  return count === 1 ? "1 transaction" : `${count} transactions`;
}

export function blockedDeleteMessage(transactionCount: number): string {
  return `This portfolio has ${transactionCountLabel(transactionCount).toLowerCase()}. Delete them before deleting the portfolio.`;
}
