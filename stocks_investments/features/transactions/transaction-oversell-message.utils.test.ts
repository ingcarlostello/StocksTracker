import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { CANDIDATE_TRANSACTION_ID } from "@/domain/portfolio/portfolio.constants";
import type { TransactionInput, TransactionLike } from "@/domain/transactions/transaction.type";
import {
  describeOversell,
  oversellMessage,
  oversellPortfolioId,
  oversellSubject,
} from "./transaction-oversell-message.utils";
import type { OversellContext } from "./transaction-oversell.type";

const retiro = { id: "p-retiro" as Id<"portfolios">, name: "Retiro", createdAt: 1 };
const viajes = { id: "p-viajes" as Id<"portfolios">, name: "Viajes", createdAt: 2 };

function stored(overrides: Partial<TransactionLike> = {}): TransactionLike {
  return {
    id: "stored-1",
    portfolioId: "p-retiro",
    ticker: "AAPL",
    type: "SELL",
    date: "2025-05-01",
    quantity: 6,
    price: 100,
    totalAmount: 600,
    createdAt: 1,
    ...overrides,
  };
}

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return { portfolioId: "p-retiro", ticker: "AAPL", type: "SELL", date: "2025-05-01", quantity: 6, price: 100, ...overrides };
}

function violation(transactionId: string, ticker = "AAPL") {
  return { ticker, date: "2025-05-01", transactionId, available: 5, requested: 6 };
}

describe("oversellSubject", () => {
  const history = [stored()];
  const create: OversellContext = { action: "create", candidate: input(), history };

  it("create: the client candidate is this sale", () => {
    expect(oversellSubject(violation(CANDIDATE_TRANSACTION_ID), create)).toBe("this-sale");
  });

  it("create: a server id the client never saw (the rolled-back insert) is this sale", () => {
    expect(oversellSubject(violation("rolled-back"), create)).toBe("this-sale");
    expect(oversellSubject(violation("rolled-back"), { ...create, history: undefined })).toBe("this-sale");
  });

  it("create: a stored SELL is the saved sale", () => {
    expect(oversellSubject(violation("stored-1"), create)).toBe("saved-sale");
  });

  const update: OversellContext = { action: "update", original: stored(), edited: input({ quantity: 7 }), history };

  it("update: the edited id is this sale", () => {
    expect(oversellSubject(violation("stored-1"), update)).toBe("this-sale");
  });

  it("update: any other id, synced or not, is a saved sale", () => {
    expect(oversellSubject(violation("stored-2"), update)).toBe("saved-sale");
    expect(oversellSubject(violation("not-synced"), update)).toBe("saved-sale");
  });

  it("remove: always a saved sale", () => {
    expect(oversellSubject(violation("stored-1"), { action: "remove", target: stored({ type: "BUY" }) })).toBe(
      "saved-sale",
    );
  });
});

describe("oversellPortfolioId", () => {
  it("create: the candidate's portfolio", () => {
    const context: OversellContext = { action: "create", candidate: input({ portfolioId: "p-viajes" }), history: [] };
    expect(oversellPortfolioId(violation(CANDIDATE_TRANSACTION_ID), context)).toBe("p-viajes");
  });

  it("remove: the target's portfolio", () => {
    const context: OversellContext = { action: "remove", target: stored({ id: "b1", type: "BUY", portfolioId: "p-viajes" }) };
    expect(oversellPortfolioId(violation("s1"), context)).toBe("p-viajes");
  });

  const original = stored({ id: "e1", type: "BUY", portfolioId: "p-retiro" });

  it("update, edited id: the new portfolio, not the stored one", () => {
    const context: OversellContext = {
      action: "update",
      original: stored({ id: "e1", portfolioId: "p-retiro" }),
      edited: input({ portfolioId: "p-viajes" }),
      history: [stored({ id: "e1", portfolioId: "p-retiro" })],
    };
    expect(oversellPortfolioId(violation("e1"), context)).toBe("p-viajes");
  });

  it("update, same portfolio: that portfolio", () => {
    // Same ticker and a sale this client has not synced: only the same-portfolio rule can resolve it.
    const context: OversellContext = {
      action: "update",
      original,
      edited: input({ type: "BUY", quantity: 3, portfolioId: "p-retiro" }),
      history: [original],
    };
    expect(oversellPortfolioId(violation("not-synced"), context)).toBe("p-retiro");
  });

  it("update, known id: the portfolio from history", () => {
    const context: OversellContext = {
      action: "update",
      original,
      edited: input({ type: "BUY", portfolioId: "p-viajes" }),
      history: [original, stored({ id: "s-retiro", portfolioId: "p-retiro" })],
    };
    expect(oversellPortfolioId(violation("s-retiro"), context)).toBe("p-retiro");
  });

  it("update, unknown id with a ticker change: resolved by ticker", () => {
    const context: OversellContext = {
      action: "update",
      original,
      edited: input({ type: "BUY", ticker: "MSFT", portfolioId: "p-viajes" }),
      history: [original],
    };
    expect(oversellPortfolioId(violation("not-synced", "MSFT"), context)).toBe("p-viajes");
    expect(oversellPortfolioId(violation("not-synced", "AAPL"), context)).toBe("p-retiro");
    expect(oversellPortfolioId(violation("not-synced", "TSLA"), context)).toBeNull();
  });

  it("update, unknown id with a same-ticker move: null, never a guess", () => {
    const context: OversellContext = {
      action: "update",
      original,
      edited: input({ type: "BUY", portfolioId: "p-viajes" }),
      history: [original],
    };
    expect(oversellPortfolioId(violation("not-synced"), context)).toBeNull();
  });
});

describe("oversellMessage", () => {
  const short = { ticker: "AAPL", date: "2024-11-10", transactionId: "x", available: 0.123456, requested: 0.12346 };

  it.each([
    [
      "create",
      "this-sale",
      "Selling 0.12346 AAPL on Nov 10, 2024 needs more shares than the 0.123456 held at that point.",
      "Selling 0.12346 AAPL in Retiro on Nov 10, 2024 needs more shares than the 0.123456 held at that point.",
    ],
    [
      "create",
      "saved-sale",
      "This would leave your saved sale of 0.12346 AAPL on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
      "This would leave your saved sale of 0.12346 AAPL in Retiro on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
    ],
    [
      "update",
      "this-sale",
      "This sale of 0.12346 AAPL on Nov 10, 2024 needs more shares than the 0.123456 held at that point.",
      "This sale of 0.12346 AAPL in Retiro on Nov 10, 2024 needs more shares than the 0.123456 held at that point.",
    ],
    [
      "update",
      "saved-sale",
      "This change would leave your saved sale of 0.12346 AAPL on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
      "This change would leave your saved sale of 0.12346 AAPL in Retiro on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
    ],
    [
      "remove",
      "saved-sale",
      "Deleting this buy would leave your saved sale of 0.12346 AAPL on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
      "Deleting this buy would leave your saved sale of 0.12346 AAPL in Retiro on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
    ],
  ] as const)("%s / %s", (action, subject, withoutName, withName) => {
    expect(oversellMessage({ violation: short, action, subject, portfolioName: null })).toBe(withoutName);
    expect(oversellMessage({ violation: short, action, subject, portfolioName: "Retiro" })).toBe(withName);
  });

  it("keeps the Phase 8 create texts byte-identical when no portfolio is named", () => {
    const newSale = oversellMessage({ violation: short, action: "create", subject: "this-sale", portfolioName: null });
    const savedSale = oversellMessage({ violation: short, action: "create", subject: "saved-sale", portfolioName: null });
    expect(newSale).toBe("Selling 0.12346 AAPL on Nov 10, 2024 needs more shares than the 0.123456 held at that point.");
    expect(savedSale).toBe(
      "This would leave your saved sale of 0.12346 AAPL on Nov 10, 2024 without enough shares: only 0.123456 would be held then.",
    );
  });
});

describe("describeOversell", () => {
  const context: OversellContext = { action: "create", candidate: input({ portfolioId: "p-viajes" }), history: [] };
  const short = violation(CANDIDATE_TRANSACTION_ID);

  it("omits the name for a single-portfolio user", () => {
    expect(describeOversell(short, { ...context, candidate: input({ portfolioId: "p-retiro" }) }, [retiro])).toBe(
      "Selling 6.0000 AAPL on May 1, 2025 needs more shares than the 5.0000 held at that point.",
    );
  });

  it("names the portfolio when there are several", () => {
    expect(describeOversell(short, context, [retiro, viajes])).toBe(
      "Selling 6.0000 AAPL in Viajes on May 1, 2025 needs more shares than the 5.0000 held at that point.",
    );
  });

  it("omits the name when the portfolio cannot be resolved", () => {
    const sameTickerMove: OversellContext = {
      action: "update",
      original: stored({ id: "e1", type: "BUY" }),
      edited: input({ type: "BUY", portfolioId: "p-viajes" }),
      history: [stored({ id: "e1", type: "BUY" })],
    };
    expect(describeOversell(violation("not-synced"), sameTickerMove, [retiro, viajes])).toBe(
      "This change would leave your saved sale of 6.0000 AAPL on May 1, 2025 without enough shares: only 5.0000 would be held then.",
    );
    expect(describeOversell(short, { ...context, candidate: input({ portfolioId: "p-deleted" }) }, [retiro, viajes])).toBe(
      "Selling 6.0000 AAPL on May 1, 2025 needs more shares than the 5.0000 held at that point.",
    );
  });
});
