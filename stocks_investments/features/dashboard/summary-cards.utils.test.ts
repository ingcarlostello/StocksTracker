import { describe, expect, it } from "vitest";
import { buildHoldings, summarizePortfolio } from "@/domain/portfolio/portfolio.service";
import type { PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import { buildPositions } from "@/domain/portfolio/position.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { toPortfolioTotals } from "@/features/portfolio/portfolio-totals.utils";
import { formatSignedCurrency } from "@/utils/number-format.utils";
import { summaryCardsNote, toSummaryCards } from "./summary-cards.utils";

const idle = { isPending: false, isFetching: false };
const fetching = { isPending: false, isFetching: true };
const paused = { isPending: true, isFetching: false };

function summary(
  portfolioValue: number | null,
  totalInvested: number,
  totalGainLoss: number | null,
  portfolioReturn: number | null,
  missingPriceTickers: string[],
): PortfolioSummary {
  return { portfolioValue, totalInvested, totalGainLoss, portfolioReturn, missingPriceTickers };
}

function trade(
  id: string,
  portfolioId: string,
  type: "BUY" | "SELL",
  ticker: string,
  quantity: number,
  price: number,
  date: string,
): TransactionLike {
  return { id, portfolioId, ticker, type, date, quantity, price, totalAmount: quantity * price, createdAt: Number(id.slice(1)) };
}

// The four priced holdings of the portfolio totals fixture.
const COMPLETE = summarizePortfolio(
  buildHoldings(
    [
      { ticker: "AAPL", shares: 10, costBasis: 1500, realizedGain: 0 },
      { ticker: "MSFT", shares: 4, costBasis: 1280, realizedGain: 0 },
      { ticker: "TSLA", shares: 5, costBasis: 1050, realizedGain: 0 },
      { ticker: "VOO", shares: 12, costBasis: 4200, realizedGain: 0 },
    ],
    { AAPL: 189.32, MSFT: 378.1, TSLA: 180, VOO: 431.27 },
  ),
);
const MISSING_PRICES = summary(null, 480, null, null, ["MSFT", "TSLA"]);
const LOSS = summary(900, 1050, -150, -150 / 1050, []);
const BREAK_EVEN_NOISE = summary(1000, 1000, -5.7e-14, -5.7e-17, []);
const NOTHING_HELD = summarizePortfolio([]);

// The same ticker bought in two portfolios, priced at 120.
const P1_TRADES = [trade("t1", "p1", "BUY", "AAPL", 10, 100, "2026-09-01")];
const P2_TRADES = [trade("t2", "p2", "BUY", "AAPL", 5, 130, "2026-09-02")];
const COMBINED_PRICES = { AAPL: 120 };

function summarizeTrades(transactions: readonly TransactionLike[], prices: Record<string, number>): PortfolioSummary {
  return summarizePortfolio(buildHoldings(buildPositions(transactions), prices));
}

const COMBINED = summarizeTrades([...P1_TRADES, ...P2_TRADES], COMBINED_PRICES);

describe("toSummaryCards", () => {
  const completeCards = {
    portfolioValue: { label: "$9,480.84", isAvailable: true },
    totalInvestedLabel: "$8,030.00",
    totalGainLoss: { label: "+$1,450.84", sign: "positive" },
    portfolioReturn: { label: "+18.07%", sign: "positive" },
    note: null,
  };

  it("formats complete cards", () => {
    expect(toSummaryCards(COMPLETE, idle)).toEqual(completeCards);
  });

  it("keeps the cards during a refresh with every price known", () => {
    expect(toSummaryCards(COMPLETE, fetching)).toEqual(completeCards);
  });

  it("withholds value, gain and return and names the tickers without a price", () => {
    expect(toSummaryCards(MISSING_PRICES, idle)).toEqual({
      portfolioValue: { label: "—", isAvailable: false },
      totalInvestedLabel: "$480.00",
      totalGainLoss: { label: "—", sign: null },
      portfolioReturn: { label: "—", sign: null },
      note: "No price for MSFT, TSLA, so Portfolio Value, Total Gain / Loss and Portfolio Return can't be calculated.",
    });
  });

  it("waits for placeholder data and for a paused offline query", () => {
    expect(toSummaryCards(MISSING_PRICES, fetching).note).toBe("Totals appear once prices load.");
    expect(toSummaryCards(MISSING_PRICES, paused).note).toBe("Totals appear once prices load.");
  });

  it("shows a loss", () => {
    const cards = toSummaryCards(LOSS, idle);
    expect(cards.totalGainLoss).toEqual({ label: "-$150.00", sign: "negative" });
    expect(cards.portfolioReturn).toEqual({ label: "-14.29%", sign: "negative" });
  });

  it("shows break-even noise as zero", () => {
    const cards = toSummaryCards(BREAK_EVEN_NOISE, idle);
    expect(cards.totalGainLoss).toEqual({ label: "$0.00", sign: "zero" });
    expect(cards.portfolioReturn).toEqual({ label: "0.00%", sign: "zero" });
  });

  it("takes the color from the rounded text", () => {
    expect(toSummaryCards(summary(1000.004, 1000, 0.004, 0.000004, []), idle).totalGainLoss).toEqual({
      label: "$0.00",
      sign: "zero",
    });
    expect(toSummaryCards(summary(999.994, 1000, -0.006, -0.000006, []), idle).totalGainLoss).toEqual({
      label: "-$0.01",
      sign: "negative",
    });
    expect(toSummaryCards(summary(1000.04, 1000, 0.04, 0.00004, []), idle).portfolioReturn).toEqual({
      label: "0.00%",
      sign: "zero",
    });
    expect(toSummaryCards(summary(999.94, 1000, -0.06, -0.00006, []), idle).portfolioReturn).toEqual({
      label: "-0.01%",
      sign: "negative",
    });
  });

  it.each([
    ["idle", idle],
    ["fetching", fetching],
  ])("shows zeros and no return when nothing is held (%s)", (_label, prices) => {
    expect(toSummaryCards(NOTHING_HELD, prices)).toEqual({
      portfolioValue: { label: "$0.00", isAvailable: true },
      totalInvestedLabel: "$0.00",
      totalGainLoss: { label: "$0.00", sign: "zero" },
      portfolioReturn: { label: "—", sign: null },
      note: null,
    });
  });

  it("ignores realized gains", () => {
    const history = [
      trade("t1", "p1", "BUY", "AAPL", 10, 100, "2026-09-01"),
      trade("t2", "p1", "SELL", "AAPL", 4, 130, "2026-09-02"),
    ];
    // The sale realized 120, which must not reach any card.
    expect(buildPositions(history)[0].realizedGain).toBe(120);

    expect(toSummaryCards(summarizeTrades(history, { AAPL: 110 }), idle)).toEqual({
      portfolioValue: { label: "$660.00", isAvailable: true },
      totalInvestedLabel: "$600.00",
      totalGainLoss: { label: "+$60.00", sign: "positive" },
      portfolioReturn: { label: "+10.00%", sign: "positive" },
      note: null,
    });
  });

  it("shows the combined view as the sum of each portfolio", () => {
    const p1 = summarizeTrades(P1_TRADES, COMBINED_PRICES);
    const p2 = summarizeTrades(P2_TRADES, COMBINED_PRICES);

    expect(COMBINED.portfolioValue).toBe(1800);
    expect(p1.portfolioValue).toBe(1200);
    expect(p2.portfolioValue).toBe(600);
    expect(COMBINED.totalInvested).toBe(1650);
    expect(p1.totalInvested).toBe(1000);
    expect(p2.totalInvested).toBe(650);

    expect(toSummaryCards(COMBINED, idle)).toEqual({
      portfolioValue: { label: "$1,800.00", isAvailable: true },
      totalInvestedLabel: "$1,650.00",
      totalGainLoss: { label: "+$150.00", sign: "positive" },
      portfolioReturn: { label: "+9.09%", sign: "positive" },
      note: null,
    });
    expect(toSummaryCards(p1, idle)).toEqual({
      portfolioValue: { label: "$1,200.00", isAvailable: true },
      totalInvestedLabel: "$1,000.00",
      totalGainLoss: { label: "+$200.00", sign: "positive" },
      portfolioReturn: { label: "+20.00%", sign: "positive" },
      note: null,
    });
    expect(toSummaryCards(p2, idle)).toEqual({
      portfolioValue: { label: "$600.00", isAvailable: true },
      totalInvestedLabel: "$650.00",
      totalGainLoss: { label: "-$50.00", sign: "negative" },
      portfolioReturn: { label: "-7.69%", sign: "negative" },
      note: null,
    });
  });

  const summaries = [
    ["complete", COMPLETE],
    ["missing prices", MISSING_PRICES],
    ["loss", LOSS],
    ["break-even noise", BREAK_EVEN_NOISE],
    ["nothing held", NOTHING_HELD],
    ["combined", COMBINED],
  ] as const;
  const priceStates = [
    ["idle", idle],
    ["fetching", fetching],
    ["paused", paused],
  ] as const;
  const matrix = summaries.flatMap(([summaryLabel, s]) =>
    priceStates.map(([pricesLabel, p]) => [summaryLabel, pricesLabel, s, p] as const),
  );

  it.each(matrix)("equals /portfolio's totals (%s, %s)", (_summaryLabel, _pricesLabel, s, p) => {
    const totals = toPortfolioTotals(s, p);
    const cards = toSummaryCards(s, p);
    expect(cards.portfolioValue.label).toBe(totals.marketValueLabel);
    expect(cards.portfolioValue.isAvailable).toBe(totals.isComplete);
    expect(cards.totalInvestedLabel).toBe(totals.totalInvestedLabel);
    expect(cards.totalGainLoss).toEqual(totals.gainLoss);
    expect(cards.portfolioReturn).toEqual(totals.returnPercentage ?? { label: "—", sign: null });
    expect(cards.note === null).toBe(totals.note === null);
  });

  it("shows a gain equal to value minus invested", () => {
    const value = COMPLETE.portfolioValue;
    if (value === null) throw new Error("expected a fully priced fixture");
    expect(toSummaryCards(COMPLETE, idle).totalGainLoss.label).toBe(formatSignedCurrency(value - COMPLETE.totalInvested));
  });
});

describe("summaryCardsNote", () => {
  it("is null when nothing is withheld", () => {
    expect(summaryCardsNote(null)).toBeNull();
  });

  it("waits for prices", () => {
    expect(summaryCardsNote({ kind: "waiting-for-prices" })).toBe("Totals appear once prices load.");
  });

  it("names the tickers without a price with the dashboard's card names", () => {
    expect(summaryCardsNote({ kind: "missing-prices", tickers: ["BRK.B"] })).toBe(
      "No price for BRK.B, so Portfolio Value, Total Gain / Loss and Portfolio Return can't be calculated.",
    );
  });
});
