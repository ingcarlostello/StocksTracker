import { describe, expect, it } from "vitest";
import { buildHoldings, summarizePortfolio } from "@/domain/portfolio/portfolio.service";
import type { Holding, PortfolioSummary } from "@/domain/portfolio/portfolio.type";
import { toHoldingRows } from "./holdings-table.utils";
import { toPortfolioTotals } from "./portfolio-totals.utils";

const idle = { isPending: false, isFetching: false };

function summary(
  portfolioValue: number | null,
  totalInvested: number,
  totalGainLoss: number | null,
  portfolioReturn: number | null,
  missingPriceTickers: string[],
): PortfolioSummary {
  return { portfolioValue, totalInvested, totalGainLoss, portfolioReturn, missingPriceTickers };
}

const MISSING_PRICES = summary(null, 480, null, null, ["MSFT", "TSLA"]);

describe("toPortfolioTotals", () => {
  it("formats complete totals", () => {
    // The four priced holdings of the holdings table fixture.
    const holdings = buildHoldings(
      [
        { ticker: "AAPL", shares: 10, costBasis: 1500, realizedGain: 0 },
        { ticker: "MSFT", shares: 4, costBasis: 1280, realizedGain: 0 },
        { ticker: "TSLA", shares: 5, costBasis: 1050, realizedGain: 0 },
        { ticker: "VOO", shares: 12, costBasis: 4200, realizedGain: 0 },
      ],
      { AAPL: 189.32, MSFT: 378.1, TSLA: 180, VOO: 431.27 },
    );
    const complete = {
      isComplete: true,
      marketValueLabel: "$9,480.84",
      totalInvestedLabel: "$8,030.00",
      gainLoss: { label: "+$1,450.84", sign: "positive" },
      returnPercentage: { label: "+18.07%", sign: "positive" },
      note: null,
    };
    expect(toPortfolioTotals(summarizePortfolio(holdings), idle)).toEqual(complete);
    // A refresh with every price already known keeps the totals.
    expect(toPortfolioTotals(summarizePortfolio(holdings), { isPending: false, isFetching: true })).toEqual(complete);
  });

  it("withholds value and gain and names the tickers without a price", () => {
    expect(toPortfolioTotals(MISSING_PRICES, idle)).toEqual({
      isComplete: false,
      marketValueLabel: "—",
      totalInvestedLabel: "$480.00",
      gainLoss: { label: "—", sign: null },
      returnPercentage: null,
      note: "No price for MSFT, TSLA, so Market Value and Total Gain / Loss can't be totaled.",
    });
  });

  it("waits for placeholder data", () => {
    expect(toPortfolioTotals(MISSING_PRICES, { isPending: false, isFetching: true }).note).toBe(
      "Totals appear once prices load.",
    );
  });

  it("waits for a paused offline query", () => {
    expect(toPortfolioTotals(MISSING_PRICES, { isPending: true, isFetching: false }).note).toBe(
      "Totals appear once prices load.",
    );
  });

  it("shows a total loss", () => {
    const totals = toPortfolioTotals(summary(900, 1050, -150, -150 / 1050, []), idle);
    expect(totals.gainLoss).toEqual({ label: "-$150.00", sign: "negative" });
    expect(totals.returnPercentage).toEqual({ label: "-14.29%", sign: "negative" });
  });

  it("shows break-even noise as zero", () => {
    const totals = toPortfolioTotals(summary(1000, 1000, -5.7e-14, -5.7e-17, []), idle);
    expect(totals.gainLoss).toEqual({ label: "$0.00", sign: "zero" });
    expect(totals.returnPercentage).toEqual({ label: "0.00%", sign: "zero" });
  });

  it("hides the return line when nothing is invested", () => {
    const totals = toPortfolioTotals(summary(0, 0, 0, null, []), idle);
    expect(totals.returnPercentage).toBeNull();
    expect(totals.gainLoss).toEqual({ label: "$0.00", sign: "zero" });
    expect(totals.note).toBeNull();
  });

  it("formats totals from exact sums, not rounded rows (cent caveat)", () => {
    const centHolding = (ticker: string): Holding => ({
      ticker,
      shares: 1,
      averageCost: 1,
      totalInvested: 1,
      currentPrice: 1.005,
      marketValue: 1.005,
      gainLoss: 1.005 - 1,
      returnPercentage: (1.005 - 1) / 1,
    });
    const holdings = [centHolding("A"), centHolding("B"), centHolding("C")];

    for (const row of toHoldingRows(holdings)) {
      expect(row.marketValueLabel).toBe("$1.01");
      expect(row.gainLoss).toEqual({ label: "$0.00", sign: "zero" });
    }

    const totals = toPortfolioTotals(summarizePortfolio(holdings), idle);
    expect(totals.marketValueLabel).toBe("$3.01");
    expect(totals.gainLoss).toEqual({ label: "+$0.01", sign: "positive" });
  });
});
