import { describe, expect, it } from "vitest";
import type { TransactionLike } from "../transactions/transaction.type";
import { SHARES_EPSILON } from "./portfolio.constants";
import { applyTransaction, buildPositions, emptyPosition, validateSellSequence } from "./position.service";
import type { Holding, Position } from "./portfolio.type";
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

function trade(id: string, portfolioId: string, type: "BUY" | "SELL", ticker: string, quantity: number, price: number, date: string): TransactionLike {
  return { id, portfolioId, ticker, type, date, quantity, price, totalAmount: quantity * price, createdAt: Number(id.slice(1)) };
}

describe("combined view across portfolios (buildPositions → buildHoldings → summarizePortfolio)", () => {
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

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

// Deterministic PRNG (mulberry32), a copy of the helper in position.service.test.ts.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One portfolio whose tickers prefix each other (F/FB, BRK.B/BRKB), in shuffled input order.
const prefixTickerTrades = [
  trade("t8", "retiro", "SELL", "F", 4, 15, "2025-01-13"),
  trade("t3", "retiro", "SELL", "AAPL", 4, 130, "2025-01-06"),
  trade("t7", "retiro", "BUY", "FB", 1, 300, "2025-01-10"),
  trade("t1", "retiro", "BUY", "AAPL", 10, 100, "2025-01-02"),
  trade("t9", "retiro", "SELL", "MSFT", 5, 310, "2025-01-14"),
  trade("t5", "retiro", "BUY", "BRKB", 1, 50, "2025-01-08"),
  trade("t2", "retiro", "BUY", "MSFT", 5, 300, "2025-01-03"),
  trade("t6", "retiro", "BUY", "F", 10, 12, "2025-01-09"),
  trade("t4", "retiro", "BUY", "BRK.B", 2, 400, "2025-01-07"),
];
// MSFT is closed but still priced.
const prefixTickerPrices = { AAPL: 120, "BRK.B": 410, BRKB: 55, F: 13, FB: 310, MSFT: 999 };

// Retiro closes TSLA at a realized +50; Viajes holds all three tickers.
const retiroTrades = [
  trade("t11", "retiro", "BUY", "AAPL", 10, 100, "2025-01-02"),
  trade("t12", "retiro", "SELL", "AAPL", 4, 130, "2025-02-01"),
  trade("t13", "retiro", "BUY", "TSLA", 1, 250, "2025-01-03"),
  trade("t14", "retiro", "SELL", "TSLA", 1, 300, "2025-01-10"),
];
const viajesTrades = [
  trade("t21", "viajes", "BUY", "AAPL", 2, 150, "2025-01-15"),
  trade("t22", "viajes", "BUY", "MSFT", 1, 400, "2025-01-20"),
  trade("t23", "viajes", "BUY", "TSLA", 2, 200, "2025-01-21"),
];
const splitPrices = { AAPL: 200, MSFT: 420, TSLA: 210 };

function holdingFor(holdings: readonly Holding[], ticker: string): Holding | undefined {
  return holdings.find((holding) => holding.ticker === ticker);
}

function expectTotalsReconcile(holdings: readonly Holding[]) {
  const summary = summarizePortfolio(holdings);
  expect(summary.missingPriceTickers).toEqual([]);
  expect(summary.portfolioValue).toBeCloseTo(sum(holdings.map((holding) => holding.marketValue ?? 0)), 9);
  expect(summary.totalInvested).toBeCloseTo(sum(holdings.map((holding) => holding.totalInvested)), 9);
  expect(summary.totalGainLoss).toBeCloseTo(sum(holdings.map((holding) => holding.gainLoss ?? 0)), 9);
  expect(summary.totalGainLoss).toBe((summary.portfolioValue ?? 0) - summary.totalInvested);
}

describe("multi-ticker holdings are never mixed", () => {
  const holdings = buildHoldings(buildPositions(prefixTickerTrades), prefixTickerPrices);

  it("keeps one row per ticker even when one ticker prefixes another, and drops a closed ticker that has a price", () => {
    expect(holdings.map((holding) => holding.ticker)).toEqual(["AAPL", "BRK.B", "BRKB", "F", "FB"]);
  });

  it("uses only each ticker's own trades and price", () => {
    const expected = [
      { ticker: "AAPL", shares: 6, averageCost: 100, totalInvested: 600, marketValue: 720, gainLoss: 120, returnPercentage: 0.2 },
      { ticker: "BRK.B", shares: 2, averageCost: 400, totalInvested: 800, marketValue: 820, gainLoss: 20, returnPercentage: 0.025 },
      { ticker: "BRKB", shares: 1, averageCost: 50, totalInvested: 50, marketValue: 55, gainLoss: 5, returnPercentage: 0.1 },
      { ticker: "F", shares: 6, averageCost: 12, totalInvested: 72, marketValue: 78, gainLoss: 6, returnPercentage: 1 / 12 },
      { ticker: "FB", shares: 1, averageCost: 300, totalInvested: 300, marketValue: 310, gainLoss: 10, returnPercentage: 1 / 30 },
    ];
    expected.forEach(({ returnPercentage: expectedReturn, ...fields }, index) => {
      expect(holdings[index]).toMatchObject(fields);
      expect(holdings[index].returnPercentage).toBeCloseTo(expectedReturn, 12);
    });
  });

  it("summary", () => {
    expect(summarizePortfolio(holdings)).toEqual({
      portfolioValue: 1983,
      totalInvested: 1822,
      totalGainLoss: 161,
      portfolioReturn: 161 / 1822,
      missingPriceTickers: [],
    });
  });

  it("a missing price nulls only that ticker's row", () => {
    const withoutFb: Record<string, number> = { ...prefixTickerPrices };
    delete withoutFb.FB;
    const partial = buildHoldings(buildPositions(prefixTickerTrades), withoutFb);
    expect(holdingFor(partial, "FB")).toMatchObject({ currentPrice: null, marketValue: null, gainLoss: null, returnPercentage: null });
    expect(holdingFor(partial, "F")).toMatchObject({ currentPrice: 13, marketValue: 78 });
    expect(summarizePortfolio(partial).missingPriceTickers).toEqual(["FB"]);
  });
});

describe("totals reconcile with holding rows", () => {
  it("on multi-ticker holdings", () => {
    expectTotalsReconcile(buildHoldings(buildPositions(prefixTickerTrades), prefixTickerPrices));
  });

  it("with fractional shares", () => {
    const transactions = [
      trade("t1", "retiro", "BUY", "VOO", 0.1, 400.5, "2025-01-02"),
      trade("t2", "retiro", "BUY", "VOO", 0.2, 401.25, "2025-01-03"),
      trade("t3", "retiro", "BUY", "AAPL", 3.3, 189.32, "2025-01-06"),
    ];
    expectTotalsReconcile(buildHoldings(buildPositions(transactions), { VOO: 431.27, AAPL: 190.01 }));
  });

  it("total return is the invested-weighted mean of row returns, not the simple mean", () => {
    const holdings = buildHoldings(buildPositions([...retiroTrades, ...viajesTrades]), splitPrices);
    const returns = holdings.map((holding) => holding.returnPercentage ?? 0);
    const weighted = sum(holdings.map((holding) => (holding.returnPercentage ?? 0) * holding.totalInvested)) /
      sum(holdings.map((holding) => holding.totalInvested));
    const { portfolioReturn } = summarizePortfolio(holdings);
    expect(portfolioReturn).toBeCloseTo(weighted, 9);
    expect(Math.abs((portfolioReturn ?? 0) - sum(returns) / returns.length)).toBeGreaterThan(0.1);
  });
});

describe("combined view = sum of the individual views", () => {
  function view(transactions: readonly TransactionLike[], prices: Readonly<Record<string, number>> = splitPrices) {
    return buildHoldings(buildPositions(transactions), prices);
  }

  const all = [...retiroTrades, ...viajesTrades];

  it("each ticker's shares, invested, market value and gain add up", () => {
    // [shares, totalInvested, marketValue, gainLoss] of one ticker's row.
    const figures = (holdings: readonly Holding[], ticker: string) => {
      const holding = holdingFor(holdings, ticker);
      return holding && [holding.shares, holding.totalInvested, holding.marketValue, holding.gainLoss];
    };
    expect(figures(view(all), "AAPL")).toEqual([8, 900, 1600, 700]);
    expect(figures(view(retiroTrades), "AAPL")).toEqual([6, 600, 1200, 600]);
    expect(figures(view(viajesTrades), "AAPL")).toEqual([2, 300, 400, 100]);
    expect(figures(view(all), "MSFT")).toEqual(figures(view(viajesTrades), "MSFT"));
    expect(figures(view(all), "MSFT")).toEqual([1, 400, 420, 20]);
    expect(figures(view(all), "TSLA")).toEqual(figures(view(viajesTrades), "TSLA"));
    expect(figures(view(all), "TSLA")).toEqual([2, 400, 420, 20]);
    expect(holdingFor(view(retiroTrades), "TSLA")).toBeUndefined();
  });

  it("average cost is total basis ÷ total shares", () => {
    const aaplAverage = holdingFor(view(all), "AAPL")?.averageCost;
    expect(aaplAverage).toBe(112.5);
    // Neither the mean (125) nor the sum (250) of the two portfolios' averages.
    expect(aaplAverage).not.toBe(125);
    expect(aaplAverage).not.toBe(250);
    // Retiro's closed TSLA at 250 does not blend into the average.
    expect(holdingFor(view(all), "TSLA")?.averageCost).toBe(200);
  });

  it("return is total gain ÷ total basis, not additive", () => {
    // Retiro's AAPL returns 1 and Viajes' returns 1/3.
    const aaplReturn = holdingFor(view(all), "AAPL")?.returnPercentage ?? null;
    expect(aaplReturn).toBeCloseTo(700 / 900, 12);
    expect(aaplReturn).not.toBeCloseTo(1 + 1 / 3);
    expect(aaplReturn).not.toBeCloseTo(2 / 3);
  });

  it("summary money totals add up; return does not", () => {
    const [combined, retiro, viajes] = [all, retiroTrades, viajesTrades].map((transactions) =>
      summarizePortfolio(view(transactions)),
    );
    expect(combined).toEqual({ portfolioValue: 2440, totalInvested: 1700, totalGainLoss: 740, portfolioReturn: 740 / 1700, missingPriceTickers: [] });
    expect(retiro).toEqual({ portfolioValue: 1200, totalInvested: 600, totalGainLoss: 600, portfolioReturn: 1, missingPriceTickers: [] });
    expect(viajes).toEqual({ portfolioValue: 1240, totalInvested: 1100, totalGainLoss: 140, portfolioReturn: 140 / 1100, missingPriceTickers: [] });
    expect(combined.portfolioValue).toBe((retiro.portfolioValue ?? 0) + (viajes.portfolioValue ?? 0));
    expect(combined.totalInvested).toBe(retiro.totalInvested + viajes.totalInvested);
    expect(combined.totalGainLoss).toBe((retiro.totalGainLoss ?? 0) + (viajes.totalGainLoss ?? 0));
    expect(combined.portfolioReturn).not.toBeCloseTo((retiro.portfolioReturn ?? 0) + (viajes.portfolioReturn ?? 0));
  });

  it("realized gains are not part of Total Gain / Loss", () => {
    // Retiro's TSLA sale realized +50, which stays out of the unrealized total.
    expect(summarizePortfolio(view(all)).totalGainLoss).toBe(740);
  });

  it("a position closed in one portfolio does not dilute another's average", () => {
    const transactions = [
      trade("t1", "retiro", "BUY", "AAPL", 10, 100, "2025-01-02"),
      trade("t2", "retiro", "SELL", "AAPL", 10, 120, "2025-01-03"),
      trade("t3", "viajes", "BUY", "AAPL", 2, 150, "2025-01-04"),
    ];
    expect(holdingFor(view(transactions), "AAPL")).toMatchObject({ shares: 2, averageCost: 150, totalInvested: 300 });
  });

  it("a missing price withholds the combined totals and only the views that hold it", () => {
    const prices = { AAPL: 200, TSLA: 210 };
    expect(summarizePortfolio(view(retiroTrades, prices))).toMatchObject({ portfolioValue: 1200, missingPriceTickers: [] });
    expect(summarizePortfolio(view(viajesTrades, prices)).missingPriceTickers).toEqual(["MSFT"]);
    expect(summarizePortfolio(view(all, prices))).toMatchObject({
      portfolioValue: null,
      totalInvested: 1700,
      missingPriceTickers: ["MSFT"],
    });
  });

  it("sub-epsilon dust never becomes a combined holding", () => {
    const retiroDust = [trade("t1", "retiro", "BUY", "AAPL", 6e-10, 100, "2025-01-02")];
    const viajesDust = [trade("t2", "viajes", "BUY", "AAPL", 6e-10, 100, "2025-01-02")];
    expect(view(retiroDust)).toEqual([]);
    expect(view(viajesDust)).toEqual([]);
    expect(view([...retiroDust, ...viajesDust])).toEqual([]);

    const leaking = [
      trade("t3", "retiro", "BUY", "AAPL", 5e-10, 1e6, "2025-01-02"),
      trade("t4", "viajes", "BUY", "AAPL", 10, 100, "2025-01-02"),
    ];
    const holding = holdingFor(view(leaking), "AAPL");
    expect(holding?.shares).toBe(10);
    expect(holding?.totalInvested).toBe(1000);
    expect(summarizePortfolio(view(leaking)).totalInvested).toBe(1000);
  });

  it("combined equals the sum of individual views on seeded random histories", () => {
    const PORTFOLIOS = ["p1", "p2", "p3"];
    const TICKERS = ["AAPL", "F", "FB", "MSFT"];
    // Two 5e-10 buys sum to exactly SHARES_EPSILON (still closed); any pair with 6e-10 exceeds it.
    const QUANTITIES = [6e-10, 5e-10, 0.1, 0.2, 0.3, 0.5, 1, 5];
    const TRADE_PRICES = [50, 100.25];
    const CLOSES = { AAPL: 190.5, F: 12.25, FB: 310, MSFT: 420.1 };
    const HISTORY_COUNT = 300;
    const random = seededRandom(7);
    function pick<T>(values: readonly T[]): T {
      return values[Math.floor(random() * values.length)];
    }
    const day = (index: number) => new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10);
    // Relative tolerance: tighter than the dust itself on shares and invested; gain cancels, so value and gain get 1e-9.
    const expectNear = (actual: number, expected: number, relative: number, context: string) =>
      expect(Math.abs(actual - expected), context).toBeLessThanOrEqual(relative * Math.max(1, Math.abs(expected)));
    const isDust = (shares: number) => shares > 0 && shares <= SHARES_EPSILON;
    // Guards the generator: dust must actually occur alone, beside an open position, and summed across portfolios.
    const guards = { subEpsilonLeftover: 0, dustBesideOpen: 0, dustOnlyTicker: 0 };

    for (let run = 0; run < HISTORY_COUNT; run += 1) {
      // Generation order is canonical order: one day and one createdAt per transaction.
      const history: TransactionLike[] = [];
      const count = 1 + Math.floor(random() * 15);
      for (let index = 0; index < count; index += 1) {
        const portfolioId = pick(PORTFOLIOS);
        const ticker = pick(TICKERS);
        const type = random() < 0.6 ? "BUY" : "SELL";
        const quantity = pick(QUANTITIES);
        const price = pick(TRADE_PRICES);
        const transaction = trade(`t${index}`, portfolioId, type, ticker, quantity, price, day(index));
        if (type === "SELL" && !validateSellSequence([...history, transaction]).ok) continue;
        history.push(transaction);
      }
      const prices: Record<string, number> = { ...CLOSES };
      if (random() < 0.2) delete prices[pick(TICKERS)];

      const context = JSON.stringify({ run, history, prices });
      const combined = buildHoldings(buildPositions(history), prices);
      const parts = PORTFOLIOS.map((portfolioId) =>
        buildHoldings(buildPositions(history.filter((t) => t.portfolioId === portfolioId)), prices),
      );

      // (a) A ticker is a combined holding exactly when some portfolio holds it.
      const heldTickers = [...new Set(parts.flatMap((holdings) => holdings.map((holding) => holding.ticker)))].sort();
      expect(combined.map((holding) => holding.ticker), context).toEqual(heldTickers);

      // (b) Additive row fields.
      for (const holding of combined) {
        const same = parts.flatMap((holdings) => holdings.filter((h) => h.ticker === holding.ticker));
        expectNear(holding.shares, sum(same.map((h) => h.shares)), 1e-12, context);
        expectNear(holding.totalInvested, sum(same.map((h) => h.totalInvested)), 1e-12, context);
        const hasPrice = Object.hasOwn(prices, holding.ticker);
        for (const row of [holding, ...same]) {
          expect(row.marketValue === null, context).toBe(!hasPrice);
          expect(row.gainLoss === null, context).toBe(!hasPrice);
        }
        if (!hasPrice) continue;
        expectNear(holding.marketValue ?? 0, sum(same.map((h) => h.marketValue ?? 0)), 1e-9, context);
        expectNear(holding.gainLoss ?? 0, sum(same.map((h) => h.gainLoss ?? 0)), 1e-9, context);
      }

      // (c) Summary money totals.
      const combinedSummary = summarizePortfolio(combined);
      const partSummaries = parts.map((holdings) => summarizePortfolio(holdings));
      expectNear(combinedSummary.totalInvested, sum(partSummaries.map((s) => s.totalInvested)), 1e-12, context);
      const incomplete = partSummaries.some((s) => s.portfolioValue === null);
      expect(combinedSummary.portfolioValue === null, context).toBe(incomplete);
      if (!incomplete) {
        expectNear(combinedSummary.portfolioValue ?? 0, sum(partSummaries.map((s) => s.portfolioValue ?? 0)), 1e-9, context);
        expectNear(combinedSummary.totalGainLoss ?? 0, sum(partSummaries.map((s) => s.totalGainLoss ?? 0)), 1e-9, context);
      }

      // Guard counters from an unsettled replay of each (portfolio, ticker) position.
      const unsettled = new Map<string, { portfolioId: string; position: Position }>();
      for (const t of history) {
        const key = `${t.portfolioId}/${t.ticker}`;
        const position = unsettled.get(key)?.position ?? emptyPosition(t.ticker);
        unsettled.set(key, { portfolioId: t.portfolioId, position: applyTransaction(position, t) });
      }
      const entries = [...unsettled.values()];
      const dust = entries.filter((entry) => isDust(entry.position.shares));
      if (dust.length > 0) guards.subEpsilonLeftover += 1;
      const besideOpen = dust.some((entry) =>
        entries.some(
          (other) =>
            other.portfolioId !== entry.portfolioId &&
            other.position.ticker === entry.position.ticker &&
            other.position.shares > SHARES_EPSILON,
        ),
      );
      if (besideOpen) guards.dustBesideOpen += 1;
      const dustOnly = TICKERS.some((ticker) => {
        const positions = entries.filter((entry) => entry.position.ticker === ticker).map((entry) => entry.position);
        return (
          positions.every((position) => position.shares <= SHARES_EPSILON) &&
          sum(positions.map((position) => position.shares)) > SHARES_EPSILON
        );
      });
      if (dustOnly) guards.dustOnlyTicker += 1;
    }

    expect(guards.subEpsilonLeftover).toBeGreaterThan(100);
    expect(guards.dustBesideOpen).toBeGreaterThan(50);
    expect(guards.dustOnlyTicker).toBeGreaterThan(3);
  });
});
