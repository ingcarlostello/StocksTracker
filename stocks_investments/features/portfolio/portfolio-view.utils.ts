import type { OversellViolation } from "@/domain/transactions/transaction.type";
import { formatIsoDate } from "@/utils/date-format.utils";
import { formatSharesExact } from "@/utils/number-format.utils";
import type { PortfolioState } from "./portfolio-state.type";
import type { BlockedPortfolioViewState } from "./portfolio-view.type";

// Byte-identical to the Phase 7 alert text. Exact share digits, so a difference the table rounds away stays visible.
export function invalidHistoryMessage(violation: OversellViolation): string {
  const { ticker, date, available, requested } = violation;
  return `Your history sells ${formatSharesExact(requested)} ${ticker} on ${formatIsoDate(date)}, but only ${formatSharesExact(available)} shares were held then. Fix that transaction to see your portfolio.`;
}

// The non-ready states of every portfolio screen; callers narrow with `portfolio.status !== "ready"` first.
export function blockedPortfolioView(
  portfolio: Exclude<PortfolioState, { status: "ready" }>,
): BlockedPortfolioViewState {
  if (portfolio.status === "loading") return { status: "loading" };
  if (portfolio.status === "no-portfolios") return { status: "no-portfolios" };
  return { status: "invalid-history", message: invalidHistoryMessage(portfolio.violation) };
}
