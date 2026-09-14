import { CANDIDATE_TRANSACTION_ID } from "@/domain/portfolio/portfolio.constants";
import type { OversellViolation } from "@/domain/transactions/transaction.type";
import { portfolioNamesById } from "@/features/portfolio/portfolio-list.utils";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { formatIsoDate } from "@/utils/date-format.utils";
import { formatSharesExact } from "@/utils/number-format.utils";
import type { OversellAction, OversellContext, OversellSubject } from "./transaction-oversell.type";

export function oversellSubject(violation: OversellViolation, context: OversellContext): OversellSubject {
  switch (context.action) {
    case "create": {
      // The server reports the id of its rolled-back insert, which the client never saw.
      if (violation.transactionId === CANDIDATE_TRANSACTION_ID) return "this-sale";
      const isStored = (context.history ?? []).some((transaction) => transaction.id === violation.transactionId);
      return isStored ? "saved-sale" : "this-sale";
    }
    case "update":
      return violation.transactionId === context.original.id ? "this-sale" : "saved-sale";
    case "remove":
      return "saved-sale";
  }
}

// Portfolio whose position was left short, or null when it cannot be proven from what the client knows.
export function oversellPortfolioId(violation: OversellViolation, context: OversellContext): string | null {
  switch (context.action) {
    case "create":
      return context.candidate.portfolioId;
    case "remove":
      return context.target.portfolioId;
    case "update": {
      const { original, edited, history } = context;
      // The server replays the patched doc; the client history still holds the old copy.
      if (violation.transactionId === original.id) return edited.portfolioId;
      if (edited.portfolioId === original.portfolioId) return edited.portfolioId;
      const stored = history.find((transaction) => transaction.id === violation.transactionId);
      if (stored) return stored.portfolioId;
      if (original.ticker !== edited.ticker) {
        if (violation.ticker === edited.ticker) return edited.portfolioId;
        if (violation.ticker === original.ticker) return original.portfolioId;
      }
      // Same ticker moved between portfolios and a sale not synced yet: never guess.
      return null;
    }
  }
}

type OversellMessageParams = {
  violation: OversellViolation;
  action: OversellAction;
  subject: OversellSubject;
  portfolioName: string | null;
};

export function oversellMessage({ violation, action, subject, portfolioName }: OversellMessageParams): string {
  const requested = formatSharesExact(violation.requested);
  const available = formatSharesExact(violation.available);
  const date = formatIsoDate(violation.date);
  const sale = `${requested} ${violation.ticker}${portfolioName ? ` in ${portfolioName}` : ""} on ${date}`;
  const savedSaleShort = `your saved sale of ${sale} without enough shares: only ${available} would be held then.`;

  switch (action) {
    case "create":
      return subject === "this-sale"
        ? `Selling ${sale} needs more shares than the ${available} held at that point.`
        : `This would leave ${savedSaleShort}`;
    case "update":
      return subject === "this-sale"
        ? `This sale of ${sale} needs more shares than the ${available} held at that point.`
        : `This change would leave ${savedSaleShort}`;
    case "remove":
      return `Deleting this buy would leave ${savedSaleShort}`;
  }
}

// The portfolio is named only when there are several, so single-portfolio users keep the shorter text.
export function describeOversell(
  violation: OversellViolation,
  context: OversellContext,
  portfolios: readonly PortfolioOption[],
): string {
  const portfolioId = oversellPortfolioId(violation, context);
  const portfolioName =
    portfolios.length > 1 && portfolioId ? (portfolioNamesById(portfolios).get(portfolioId) ?? null) : null;
  return oversellMessage({
    violation,
    action: context.action,
    subject: oversellSubject(violation, context),
    portfolioName,
  });
}
