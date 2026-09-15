import { describe, expect, it } from "vitest";
import { buildHoldings, summarizePortfolio } from "@/domain/portfolio/portfolio.service";
import type { Holding, Position, PriceMap } from "@/domain/portfolio/portfolio.type";
import { HOLDING_ACTION_LABELS, HOLDINGS_INITIAL_SORT } from "./holdings-table.constants";
import type { HoldingSort, HoldingSortKey } from "./holdings-table.type";
import { holdingsCaption, sortHoldings, toHoldingRows } from "./holdings-table.utils";

function position(ticker: string, shares: number, costBasis: number): Position {
  return { ticker, shares, costBasis, realizedGain: 0 };
}

const POSITIONS: readonly Position[] = [
  position("AAPL", 10, 1500),
  position("MSFT", 4, 1280),
  position("TSLA", 5, 1050),
  position("NVDA", 8, 3200),
  position("VOO", 12, 4200),
];

// NVDA has no price.
const PRICES: PriceMap = { AAPL: 189.32, MSFT: 378.1, TSLA: 180, VOO: 431.27 };

const holdings = buildHoldings(POSITIONS, PRICES);

// A priced holding worth 100 at a price of 100; override any field.
function holding(overrides: Partial<Holding> & Pick<Holding, "ticker">): Holding {
  return {
    shares: 1,
    averageCost: 100,
    totalInvested: 100,
    currentPrice: 100,
    marketValue: 100,
    gainLoss: 0,
    returnPercentage: 0,
    ...overrides,
  };
}

function tickers(list: readonly { ticker: string }[]): string[] {
  return list.map((item) => item.ticker);
}

function byTicker(ticker: string): Holding {
  const found = holdings.find((candidate) => candidate.ticker === ticker);
  if (!found) throw new Error(`No fixture holding ${ticker}`);
  return found;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

const SORT_KEYS: readonly HoldingSortKey[] = [
  "ticker",
  "shares",
  "averageCost",
  "currentPrice",
  "marketValue",
  "gainLoss",
  "returnPercentage",
];

const ALL_SORTS: readonly HoldingSort[] = SORT_KEYS.flatMap((key) => [
  { key, dir: "asc" as const },
  { key, dir: "desc" as const },
]);

describe("sortHoldings", () => {
  it.each<[HoldingSortKey, string[], string[]]>([
    ["ticker", ["VOO", "TSLA", "NVDA", "MSFT", "AAPL"], ["AAPL", "MSFT", "NVDA", "TSLA", "VOO"]],
    ["shares", ["VOO", "AAPL", "NVDA", "TSLA", "MSFT"], ["MSFT", "TSLA", "NVDA", "AAPL", "VOO"]],
    ["averageCost", ["NVDA", "VOO", "MSFT", "TSLA", "AAPL"], ["AAPL", "TSLA", "MSFT", "VOO", "NVDA"]],
    ["currentPrice", ["VOO", "MSFT", "AAPL", "TSLA", "NVDA"], ["TSLA", "AAPL", "MSFT", "VOO", "NVDA"]],
    ["marketValue", ["VOO", "AAPL", "MSFT", "TSLA", "NVDA"], ["TSLA", "MSFT", "AAPL", "VOO", "NVDA"]],
    ["gainLoss", ["VOO", "AAPL", "MSFT", "TSLA", "NVDA"], ["TSLA", "MSFT", "AAPL", "VOO", "NVDA"]],
    ["returnPercentage", ["AAPL", "VOO", "MSFT", "TSLA", "NVDA"], ["TSLA", "MSFT", "VOO", "AAPL", "NVDA"]],
  ])("sorts by %s in both directions", (key, descending, ascending) => {
    expect(tickers(sortHoldings(holdings, { key, dir: "desc" }))).toEqual(descending);
    expect(tickers(sortHoldings(holdings, { key, dir: "asc" }))).toEqual(ascending);
  });

  it("starts at ticker A→Z", () => {
    expect(tickers(sortHoldings(holdings, HOLDINGS_INITIAL_SORT))).toEqual(["AAPL", "MSFT", "NVDA", "TSLA", "VOO"]);
  });

  it("puts unpriced holdings last in both directions, A→Z among themselves", () => {
    const withUnpriced = buildHoldings([...POSITIONS, position("ZM", 3, 210), position("AMD", 2, 300)], PRICES);
    expect(tickers(sortHoldings(withUnpriced, { key: "marketValue", dir: "desc" }))).toEqual([
      "VOO",
      "AAPL",
      "MSFT",
      "TSLA",
      "AMD",
      "NVDA",
      "ZM",
    ]);
    expect(tickers(sortHoldings(withUnpriced, { key: "marketValue", dir: "asc" }))).toEqual([
      "TSLA",
      "MSFT",
      "AAPL",
      "VOO",
      "AMD",
      "NVDA",
      "ZM",
    ]);
  });

  it("a priced holding with a null return sorts with the missing values", () => {
    const list = [...holdings, holding({ ticker: "AAA", totalInvested: 0, averageCost: 0, returnPercentage: null })];
    expect(tickers(sortHoldings(list, { key: "returnPercentage", dir: "desc" }))).toEqual([
      "AAPL",
      "VOO",
      "MSFT",
      "TSLA",
      "AAA",
      "NVDA",
    ]);
    expect(tickers(sortHoldings(list, { key: "returnPercentage", dir: "asc" }))).toEqual([
      "TSLA",
      "MSFT",
      "VOO",
      "AAPL",
      "AAA",
      "NVDA",
    ]);
  });

  it("breaks ties by ticker A→Z in both directions", () => {
    const list = [holding({ ticker: "X" }), holding({ ticker: "A" }), holding({ ticker: "M" })];
    expect(tickers(sortHoldings(list, { key: "marketValue", dir: "asc" }))).toEqual(["A", "M", "X"]);
    expect(tickers(sortHoldings(list, { key: "marketValue", dir: "desc" }))).toEqual(["A", "M", "X"]);
  });

  it("treats -0 and 0 as a tie", () => {
    const list = [holding({ ticker: "ZZ", gainLoss: -0 }), holding({ ticker: "AA", gainLoss: 0 })];
    expect(tickers(sortHoldings(list, { key: "gainLoss", dir: "asc" }))).toEqual(["AA", "ZZ"]);
    expect(tickers(sortHoldings(list, { key: "gainLoss", dir: "desc" }))).toEqual(["AA", "ZZ"]);
  });

  it("compares raw values that display identically", () => {
    const gains = [holding({ ticker: "A", gainLoss: 0 }), holding({ ticker: "B", gainLoss: -5.7e-14 })];
    expect(tickers(sortHoldings(gains, { key: "gainLoss", dir: "asc" }))).toEqual(["B", "A"]);
    expect(tickers(sortHoldings(gains, { key: "gainLoss", dir: "desc" }))).toEqual(["A", "B"]);

    const shares = [holding({ ticker: "P", shares: 1.00001 }), holding({ ticker: "Q", shares: 1.00002 })];
    expect(tickers(sortHoldings(shares, { key: "shares", dir: "desc" }))).toEqual(["Q", "P"]);
  });

  it("gives the same order for every input permutation", () => {
    const orders = permutations(holdings);
    expect(orders).toHaveLength(120);
    for (const sort of ALL_SORTS) {
      const expected = tickers(sortHoldings(holdings, sort));
      for (const order of orders) {
        expect(tickers(sortHoldings(order, sort))).toEqual(expected);
      }
    }
  });

  it("does not mutate the input", () => {
    const input = Object.freeze([...holdings]);
    const sorted = sortHoldings(input, { key: "marketValue", dir: "desc" });
    expect(tickers(input)).toEqual(["AAPL", "MSFT", "TSLA", "NVDA", "VOO"]);
    expect(sorted).not.toBe(input);
  });

  it("totals do not depend on the display sort", () => {
    const priced = holdings.filter((candidate) => candidate.currentPrice !== null);
    const unsorted = summarizePortfolio(priced);
    expect(unsorted.portfolioValue).not.toBeNull();
    expect(ALL_SORTS).toHaveLength(14);
    for (const sort of ALL_SORTS) {
      const summary = summarizePortfolio(sortHoldings(priced, sort));
      expect(summary.portfolioValue).toBeCloseTo(unsorted.portfolioValue ?? Number.NaN, 9);
      expect(summary.totalInvested).toBeCloseTo(unsorted.totalInvested, 9);
      expect(summary.totalGainLoss).toBeCloseTo(unsorted.totalGainLoss ?? Number.NaN, 9);
    }
  });
});

describe("toHoldingRows", () => {
  it("formats a priced row", () => {
    expect(toHoldingRows([byTicker("AAPL")])[0]).toEqual({
      ticker: "AAPL",
      sharesLabel: "10.0000",
      averageCostLabel: "$150.00",
      hasPrice: true,
      currentPriceLabel: "$189.32",
      marketValueLabel: "$1,893.20",
      gainLoss: { label: "+$393.20", sign: "positive" },
      returnPercentage: { label: "+26.21%", sign: "positive" },
      viewTransactionsHref: "/transactions?ticker=AAPL",
      actionsId: "holding-AAPL",
      actionsLabel: "Actions for AAPL",
      viewTransactionsLabel: "View transactions for AAPL",
    });
  });

  it("labels a loss", () => {
    expect(toHoldingRows([byTicker("TSLA")])[0]).toMatchObject({
      currentPriceLabel: "$180.00",
      marketValueLabel: "$900.00",
      gainLoss: { label: "-$150.00", sign: "negative" },
      returnPercentage: { label: "-14.29%", sign: "negative" },
    });
  });

  it("shows a dash and no sign without a price, but keeps cost figures", () => {
    expect(toHoldingRows([byTicker("NVDA")])[0]).toMatchObject({
      hasPrice: false,
      sharesLabel: "8.0000",
      averageCostLabel: "$400.00",
      currentPriceLabel: "—",
      marketValueLabel: "—",
      gainLoss: { label: "—", sign: null },
      returnPercentage: { label: "—", sign: null },
    });
  });

  it("shows a dash for a null return next to a price", () => {
    const [row] = toHoldingRows([holding({ ticker: "AAA", gainLoss: 12.5, returnPercentage: null })]);
    expect(row.hasPrice).toBe(true);
    expect(row.gainLoss).toEqual({ label: "+$12.50", sign: "positive" });
    expect(row.returnPercentage).toEqual({ label: "—", sign: null });
  });

  it("shows break-even float noise as zero", () => {
    const [row] = toHoldingRows([holding({ ticker: "AAA", gainLoss: -5.7e-14, returnPercentage: -1.9e-16 })]);
    expect(row.gainLoss).toEqual({ label: "$0.00", sign: "zero" });
    expect(row.returnPercentage).toEqual({ label: "0.00%", sign: "zero" });
  });

  it("signs each cell from its own rounded value", () => {
    const [row] = toHoldingRows([holding({ ticker: "AAA", gainLoss: 0.01, returnPercentage: 1e-7 })]);
    expect(row.gainLoss).toEqual({ label: "+$0.01", sign: "positive" });
    expect(row.returnPercentage).toEqual({ label: "0.00%", sign: "zero" });
  });

  it("links a dotted ticker", () => {
    expect(toHoldingRows([holding({ ticker: "BRK.B" })])[0]).toMatchObject({
      viewTransactionsHref: "/transactions?ticker=BRK.B",
      actionsId: "holding-BRK.B",
      actionsLabel: "Actions for BRK.B",
      viewTransactionsLabel: "View transactions for BRK.B",
    });
  });

  it("the item's accessible name starts with its visible label", () => {
    for (const row of toHoldingRows(holdings)) {
      expect(row.viewTransactionsLabel.startsWith(HOLDING_ACTION_LABELS.VIEW_TRANSACTIONS)).toBe(true);
    }
  });

  it("encodes an id-unsafe ticker", () => {
    expect(toHoldingRows([holding({ ticker: "A B" })])[0].actionsId).toBe("holding-A%20B");
  });

  it("keeps the input order", () => {
    expect(tickers(toHoldingRows(holdings))).toEqual(["AAPL", "MSFT", "TSLA", "NVDA", "VOO"]);
    const reversed = [...holdings].reverse();
    expect(tickers(toHoldingRows(reversed))).toEqual(tickers(reversed));
  });
});

describe("holdingsCaption", () => {
  it("names the scope, the sorted column and its direction", () => {
    expect(holdingsCaption("all portfolios", { key: "ticker", dir: "asc" })).toBe(
      "Holdings in all portfolios, sorted by Ticker ascending",
    );
    expect(holdingsCaption("Retiro", { key: "returnPercentage", dir: "desc" })).toBe(
      "Holdings in Retiro, sorted by Return % descending",
    );
    expect(holdingsCaption("Retiro", { key: "averageCost", dir: "desc" })).toBe(
      "Holdings in Retiro, sorted by Avg. Cost descending",
    );
  });
});
