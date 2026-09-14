import { describe, expect, it } from "vitest";
import type { TransactionLike } from "../transactions/transaction.type";
import { SHARES_EPSILON } from "./portfolio.constants";
import { buildPositions } from "./position.service";
import type { Position } from "./portfolio.type";
import {
  averageCost,
  buildHoldings,
  currentValue,
  gainLoss,
  openPositions,
  returnPercentage,
  summarizePortfolio,
  totalInvested,
  totalShares,
} from "./portfolio.service";

const aapl: Position = { ticker: "AAPL", shares: 2, costBasis: 300, realizedGain: 0 };

describe("position metrics (spec example: 2 shares, 300 invested, price 200)", () => {
  it("totalShares is 2", () => expect(totalShares(aapl)).toBe(2));
  it("totalInvested is 300", () => expect(totalInvested(aapl)).toBe(300));
  it("averageCost is 150", () => expect(averageCost(aapl)).toBe(150));
  it("currentValue is 400", () => expect(currentValue(aapl, 200)).toBe(400));
  it("gainLoss is +100", () => expect(gainLoss(aapl, 200)).toBe(100));
  it("returnPercentage is the ratio 1/3 (33.33%)", () => {
    expect(returnPercentage(aapl, 200)).toBeCloseTo(1 / 3, 12);
  });
});

describe("position metric edge cases", () => {
  const closed: Position = { ticker: "AAPL", shares: 0, costBasis: 0, realizedGain: 0 };

  it("averageCost is null for a closed position", () => {
    expect(averageCost(closed)).toBeNull();
    expect(averageCost({ ticker: "AAPL", shares: SHARES_EPSILON, costBasis: 0, realizedGain: 0 })).toBeNull();
  });

  it("returnPercentage is null when nothing is invested", () => {
    expect(returnPercentage(closed, 200)).toBeNull();
  });

  it("reports a loss as a negative gain and ratio", () => {
    expect(gainLoss(aapl, 120)).toBe(-60);
    expect(returnPercentage(aapl, 120)).toBeCloseTo(-0.2, 12);
  });
});

describe("buildHoldings", () => {
  it("builds a priced holding row", () => {
    expect(buildHoldings([aapl], { AAPL: 200 })).toEqual([
      {
        ticker: "AAPL",
        shares: 2,
        averageCost: 150,
        totalInvested: 300,
        currentPrice: 200,
        marketValue: 400,
        gainLoss: 100,
        returnPercentage: 1 / 3,
      },
    ]);
  });

  it("leaves price-dependent fields null when the price is missing", () => {
    const [holding] = buildHoldings([aapl], {});
    expect(holding).toMatchObject({
      averageCost: 150,
      totalInvested: 300,
      currentPrice: null,
      marketValue: null,
      gainLoss: null,
      returnPercentage: null,
    });
  });

  it("does not read inherited object keys as prices", () => {
    const [holding] = buildHoldings([{ ticker: "constructor", shares: 1, costBasis: 1, realizedGain: 0 }], {});
    expect(holding.currentPrice).toBeNull();
  });

  it("excludes positions with no shares left", () => {
    const positions: Position[] = [
      aapl,
      { ticker: "MSFT", shares: 0, costBasis: 0, realizedGain: 0 },
      { ticker: "TSLA", shares: SHARES_EPSILON, costBasis: 0, realizedGain: 0 },
    ];
    expect(buildHoldings(positions, { AAPL: 200, MSFT: 300, TSLA: 250 }).map((h) => h.ticker)).toEqual([
      "AAPL",
    ]);
  });

  it("keeps a small real fractional holding", () => {
    const [holding] = buildHoldings([{ ticker: "VOO", shares: 0.001, costBasis: 0.41, realizedGain: 0 }], { VOO: 410 });
    expect(holding.ticker).toBe("VOO");
    expect(holding.averageCost).toBeCloseTo(410, 9);
  });
});

describe("openPositions", () => {
  it("keeps only positions with shares left, in input order", () => {
    const positions: Position[] = [
      { ticker: "MSFT", shares: 3, costBasis: 180, realizedGain: 0 },
      { ticker: "TSLA", shares: 0, costBasis: 0, realizedGain: 50 },
      aapl,
    ];
    expect(openPositions(positions).map((p) => p.ticker)).toEqual(["MSFT", "AAPL"]);
  });
});

describe("summarizePortfolio", () => {
  const positions: Position[] = [aapl, { ticker: "MSFT", shares: 3, costBasis: 180, realizedGain: 0 }];

  it("totals reconcile with the holding rows", () => {
    const holdings = buildHoldings(positions, { AAPL: 200, MSFT: 50 });
    const summary = summarizePortfolio(holdings);

    expect(summary.portfolioValue).toBe(550);
    expect(summary.totalInvested).toBe(480);
    expect(summary.totalGainLoss).toBe(70);
    expect(summary.portfolioReturn).toBeCloseTo(70 / 480, 12);
    expect(summary.missingPriceTickers).toEqual([]);

    const rowGain = holdings.reduce((sum, h) => sum + (h.gainLoss ?? 0), 0);
    expect(summary.totalGainLoss).toBeCloseTo(rowGain, 9);
  });

  it("withholds value totals and lists tickers without a price", () => {
    const summary = summarizePortfolio(buildHoldings(positions, { AAPL: 200 }));
    expect(summary).toEqual({
      portfolioValue: null,
      totalInvested: 480,
      totalGainLoss: null,
      portfolioReturn: null,
      missingPriceTickers: ["MSFT"],
    });
  });

  it("returns zero totals and no return for an empty portfolio", () => {
    expect(summarizePortfolio([])).toEqual({
      portfolioValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      portfolioReturn: null,
      missingPriceTickers: [],
    });
  });
});

describe("combined view across portfolios (buildPositions → buildHoldings → summarizePortfolio)", () => {
  function trade(id: string, portfolioId: string, type: "BUY" | "SELL", ticker: string, quantity: number, price: number, date: string): TransactionLike {
    return { id, portfolioId, ticker, type, date, quantity, price, totalAmount: quantity * price, createdAt: Number(id.slice(1)) };
  }

  const retiro = [trade("t1", "retiro", "BUY", "AAPL", 10, 100, "2025-01-02"), trade("t2", "retiro", "SELL", "AAPL", 4, 130, "2025-02-01")];
  const viajes = [trade("t3", "viajes", "BUY", "AAPL", 2, 150, "2025-01-15"), trade("t4", "viajes", "BUY", "MSFT", 1, 400, "2025-01-20")];
  const prices = { AAPL: 200, MSFT: 420 };

  function summary(transactions: TransactionLike[]) {
    return summarizePortfolio(buildHoldings(buildPositions(transactions), prices));
  }

  it("adds up each portfolio's value and invested amount", () => {
    const all = summary([...retiro, ...viajes]);
    const [a, b] = [summary(retiro), summary(viajes)];
    expect(all.totalInvested).toBeCloseTo(a.totalInvested + b.totalInvested, 9);
    expect(all.portfolioValue).toBeCloseTo((a.portfolioValue ?? 0) + (b.portfolioValue ?? 0), 9);
    // Retiro keeps 6 AAPL at average 100 (600); Viajes holds 2 AAPL at 150 (300) and 1 MSFT (400).
    expect(all).toEqual({ portfolioValue: 2020, totalInvested: 1300, totalGainLoss: 720, portfolioReturn: 720 / 1300, missingPriceTickers: [] });
  });

  it("shows one AAPL row with the combined shares and weighted average cost", () => {
    const [aapl] = buildHoldings(buildPositions([...retiro, ...viajes]), prices);
    expect(aapl).toMatchObject({ ticker: "AAPL", shares: 8, totalInvested: 900, averageCost: 112.5 });
  });
});
