import { PORTFOLIO_NAME_MAX_LENGTH } from "@/domain/portfolio/portfolio.constants";
import type { PortfolioMutationError } from "./portfolio-management.type";

export const PORTFOLIO_ERROR_MESSAGES: Record<Exclude<PortfolioMutationError["kind"], "validation">, string> = {
  "duplicate-name": "You already have a portfolio with this name.",
  "not-found": "This portfolio no longer exists.",
  "not-empty": "Delete this portfolio's transactions before deleting it.",
  unexpected: "The portfolio could not be saved. Please try again.",
};

export const PORTFOLIO_NAME_MESSAGES = {
  EMPTY_NAME: "Enter a portfolio name.",
  NAME_TOO_LONG: `Use ${PORTFOLIO_NAME_MAX_LENGTH} characters or fewer.`,
} as const;

export const NO_PORTFOLIOS_MESSAGE = "You don't have any portfolios yet. Create one to start adding transactions.";
