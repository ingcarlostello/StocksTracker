import { ConvexError } from "convex/values";
import { PORTFOLIO_ERROR_CODES } from "@/domain/portfolio/portfolio.constants";
import { isRecord } from "@/utils/type-guard.utils";
import type { PortfolioMutationError } from "./portfolio-management.type";
import { PORTFOLIO_ERROR_MESSAGES, PORTFOLIO_NAME_MESSAGES } from "./portfolio-messages.constants";

// Turns whatever a Convex portfolio mutation threw into a shape the page can render.
export function toPortfolioMutationError(error: unknown): PortfolioMutationError {
  if (!(error instanceof ConvexError) || !isRecord(error.data)) return { kind: "unexpected" };
  const { code, issue } = error.data;

  if (code === PORTFOLIO_ERROR_CODES.VALIDATION && (issue === "EMPTY_NAME" || issue === "NAME_TOO_LONG")) {
    return { kind: "validation", issue };
  }
  if (code === PORTFOLIO_ERROR_CODES.DUPLICATE_NAME) return { kind: "duplicate-name" };
  if (code === PORTFOLIO_ERROR_CODES.NOT_FOUND) return { kind: "not-found" };
  if (code === PORTFOLIO_ERROR_CODES.NOT_EMPTY) return { kind: "not-empty" };
  return { kind: "unexpected" };
}

export function portfolioErrorMessage(error: PortfolioMutationError): string {
  return error.kind === "validation" ? PORTFOLIO_NAME_MESSAGES[error.issue] : PORTFOLIO_ERROR_MESSAGES[error.kind];
}
