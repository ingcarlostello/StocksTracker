import { PORTFOLIO_NAME_MAX_LENGTH } from "./portfolio.constants";
import type { PortfolioLike, PortfolioNameResult } from "./portfolio.type";

// Trims and collapses inner whitespace; NFC keeps "ñ" typed as one or two code points the same.
export function normalizePortfolioName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ");
}

// Uniqueness key: "Retiro" and "  retiro " are the same portfolio name.
export function portfolioNameKey(name: string): string {
  return normalizePortfolioName(name).toLowerCase();
}

export function validatePortfolioName(name: string): PortfolioNameResult {
  const normalized = normalizePortfolioName(name);
  if (normalized === "") return { ok: false, code: "EMPTY_NAME" };
  if ([...normalized].length > PORTFOLIO_NAME_MAX_LENGTH) return { ok: false, code: "NAME_TOO_LONG" };
  return { ok: true, name: normalized, nameKey: normalized.toLowerCase() };
}

// Client pre-check; the server enforces the same rule through its name-key index.
export function isPortfolioNameTaken(
  portfolios: readonly PortfolioLike[],
  name: string,
  exceptId?: string,
): boolean {
  const key = portfolioNameKey(name);
  return portfolios.some((portfolio) => portfolio.id !== exceptId && portfolioNameKey(portfolio.name) === key);
}
