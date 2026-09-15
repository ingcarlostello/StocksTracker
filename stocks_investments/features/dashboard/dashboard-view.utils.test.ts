import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { buildHoldings, summarizePortfolio } from "@/domain/portfolio/portfolio.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import type { PricesState } from "@/features/market-data/prices-state.type";
import { HOLDINGS_INITIAL_SORT } from "@/features/portfolio/holdings-table.constants";
import type { HoldingsTableState } from "@/features/portfolio/holdings-table.type";
import type { PortfolioState } from "@/features/portfolio/portfolio-state.type";
import { blockedPortfolioView } from "@/features/portfolio/portfolio-view.utils";
import type { DashboardState, DashboardViewInput } from "./dashboard.type";
import { buildDashboardView } from "./dashboard-view.utils";
import { toSummaryCards } from "./summary-cards.utils";

type ReadyPortfolio = Extract<PortfolioState, { status: "ready" }>;
type ReadyDashboard = Extract<DashboardState, { status: "ready" }>;

function prices(overrides: Partial<PricesState> = {}): PricesState {
  return {
    prices: { AAPL: 200 },
    asOfDate: "2026-09-14",
    missing: [],
    isPending: false,
    isFetching: false,
    errorMessage: null,
    lastUpdatedAt: 1,
    canRefresh: true,
    refresh() {},
    ...overrides,
  };
}

const table: HoldingsTableState = { rows: [], sort: HOLDINGS_INITIAL_SORT, caption: "c", toggleSort() {} };

const retiro = { id: "p-retiro" as Id<"portfolios">, name: "Retiro", createdAt: 1 };

function tx(id: string, overrides: Partial<TransactionLike> = {}): TransactionLike<Id<"transactions">> {
  return {
    portfolioId: "p-retiro",
    ticker: "AAPL",
    type: "BUY",
    date: "2026-09-01",
    quantity: 2,
    price: 150,
    totalAmount: 300,
    createdAt: 1,
    ...overrides,
    id: id as Id<"transactions">,
  };
}

const AAPL_HOLDINGS = buildHoldings([{ ticker: "AAPL", shares: 2, costBasis: 300, realizedGain: 0 }], { AAPL: 200 });

function ready(overrides: Partial<Omit<ReadyPortfolio, "status">> = {}): ReadyPortfolio {
  const holdings = overrides.holdings ?? AAPL_HOLDINGS;
  return {
    status: "ready",
    active: { kind: "portfolio", portfolio: retiro },
    portfolios: [retiro],
    transactions: [tx("t1")],
    holdings,
    summary: summarizePortfolio(holdings),
    prices: prices(),
    ...overrides,
  };
}

function input(portfolio: PortfolioState, recentTransactions: readonly TransactionLike[] = []): DashboardViewInput {
  return { portfolio, table, recentTransactions };
}

function readyView(viewInput: DashboardViewInput): ReadyDashboard {
  const state = buildDashboardView(viewInput);
  if (state.status !== "ready") throw new Error(`expected a ready dashboard, got ${state.status}`);
  return state;
}

describe("buildDashboardView", () => {
  it("passes the loading and no-portfolios states through", () => {
    expect(buildDashboardView(input({ status: "loading" }))).toEqual({ status: "loading" });
    expect(buildDashboardView(input({ status: "no-portfolios" }))).toEqual({ status: "no-portfolios" });
  });

  it("shows the same invalid-history message as /portfolio", () => {
    const portfolio: PortfolioState = {
      status: "invalid-history",
      violation: { ticker: "AAPL", date: "2024-11-10", transactionId: "t1", available: 3, requested: 5 },
    };
    const state = buildDashboardView(input(portfolio));
    expect(state).toEqual(blockedPortfolioView(portfolio));
    expect(state).toEqual({
      status: "invalid-history",
      message:
        "Your history sells 5.0000 AAPL on Nov 10, 2024, but only 3.0000 shares were held then. Fix that transaction to see your portfolio.",
    });
  });

  it("passes prices and the shared holdings table through when something is held", () => {
    const portfolio = ready();
    const state = readyView(input(portfolio, portfolio.transactions));
    expect(state.prices).toBe(portfolio.prices);
    expect(state.holdings).toBe(table);
    expect(state.cards).toEqual(toSummaryCards(portfolio.summary, portfolio.prices));
    expect(state.priceAlerts).toBeNull();
  });

  it("raises price alerts for an error or a missing close", () => {
    const errorMessage = "The price provider could not be reached.";
    expect(readyView(input(ready({ prices: prices({ errorMessage }) }))).priceAlerts).toEqual({
      errorMessage,
      missing: [],
    });
    expect(readyView(input(ready({ prices: prices({ missing: ["ZZZZ"] }) }))).priceAlerts).toEqual({
      errorMessage: null,
      missing: ["ZZZZ"],
    });
  });

  it("hides price controls and alerts once everything is sold, even with stale placeholder data", () => {
    const recentTransactions = [tx("t2", { type: "SELL", date: "2026-09-02" }), tx("t1")];
    const portfolio = ready({
      holdings: [],
      summary: summarizePortfolio([]),
      transactions: [tx("t1"), tx("t2", { type: "SELL", date: "2026-09-02" })],
      prices: prices({ missing: ["OLD"], errorMessage: "x" }),
    });
    const state = readyView(input(portfolio, recentTransactions));

    expect(state.prices).toBeNull();
    expect(state.priceAlerts).toBeNull();
    expect(state.holdings).toBeNull();
    expect(state.cards).toEqual({
      portfolioValue: { label: "$0.00", isAvailable: true },
      totalInvestedLabel: "$0.00",
      totalGainLoss: { label: "$0.00", sign: "zero" },
      portfolioReturn: { label: "—", sign: null },
      note: null,
    });
    expect(state.recent.rows).toHaveLength(recentTransactions.length);
  });

  it("keeps the cards with no transactions at all", () => {
    const state = readyView(input(ready({ holdings: [], summary: summarizePortfolio([]), transactions: [] }), []));
    expect(state.recent.rows).toEqual([]);
    expect(state.prices).toBeNull();
    expect(state.holdings).toBeNull();
    expect(state.cards.totalInvestedLabel).toBe("$0.00");
  });

  it("shows the Portfolio column in All portfolios", () => {
    const recentTransactions = [
      tx("t2", { date: "2026-09-02", portfolioId: "p-gone" }),
      tx("t1", { portfolioId: "p-retiro" }),
    ];
    const { recent } = readyView(input(ready({ active: { kind: "all" }, portfolios: [retiro] }), recentTransactions));

    expect(recent.showPortfolioColumn).toBe(true);
    expect(recent.rows.map((row) => row.portfolioName)).toEqual(["—", "Retiro"]);
    expect(recent.caption).toBe("Recent transactions in all portfolios, sorted by Date descending");
    expect(recent.viewAllHref).toBe("/transactions");
  });

  it("hides the Portfolio column for a single portfolio", () => {
    const recentTransactions = [tx("t2", { date: "2026-09-02" }), tx("t1")];
    const { recent } = readyView(input(ready(), recentTransactions));

    expect(recent.showPortfolioColumn).toBe(false);
    expect(recent.rows.map((row) => row.portfolioName)).toEqual([null, null]);
    expect(recent.caption).toBe("Recent transactions in Retiro, sorted by Date descending");
  });

  it("keeps the price controls while cards wait for prices", () => {
    const holdings = buildHoldings([{ ticker: "AAPL", shares: 2, costBasis: 300, realizedGain: 0 }], {});
    const state = readyView(
      input(ready({ holdings, prices: prices({ prices: {}, asOfDate: null, lastUpdatedAt: null, isFetching: true }) })),
    );

    expect(state.cards.note).toBe("Totals appear once prices load.");
    expect(state.prices).not.toBeNull();
  });

  it("keeps the order of the recent transactions it is given", () => {
    const recentTransactions = [
      tx("t3", { date: "2026-09-03" }),
      tx("t2", { date: "2026-09-02" }),
      tx("t1", { date: "2026-09-01" }),
    ];
    const { recent } = readyView(input(ready(), recentTransactions));
    expect(recent.rows.map((row) => row.id)).toEqual(["t3", "t2", "t1"]);
    // An input that is not newest first is not re-sorted either.
    const reversed = readyView(input(ready(), [...recentTransactions].reverse()));
    expect(reversed.recent.rows.map((row) => row.id)).toEqual(["t1", "t2", "t3"]);
  });
});
