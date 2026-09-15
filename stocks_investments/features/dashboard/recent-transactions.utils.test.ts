import { describe, expect, it } from "vitest";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { effectiveSort } from "@/features/transactions/transaction-list-query.utils";
import { DEFAULT_LIST_QUERY } from "@/features/transactions/transaction-list.constants";
import type { TransactionRow } from "@/features/transactions/transaction-list.type";
import { sortTransactionList, toTransactionRows } from "@/features/transactions/transaction-list.utils";
import { RECENT_TRANSACTIONS_LIMIT } from "./dashboard.constants";
import type { RecentTransactionRow } from "./dashboard.type";
import { recentTransactionsCaption, selectRecentTransactions, toRecentTransactionRows } from "./recent-transactions.utils";

function tx(overrides: Partial<TransactionLike> & Pick<TransactionLike, "id">): TransactionLike {
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? 100;
  return {
    portfolioId: "p-retiro",
    ticker: "AAPL",
    type: "BUY",
    date: "2026-09-01",
    quantity,
    price,
    totalAmount: quantity * price,
    createdAt: 1,
    ...overrides,
  };
}

function ids(transactions: readonly Pick<TransactionLike, "id">[]): string[] {
  return transactions.map((transaction) => transaction.id);
}

// Deterministic shuffle so the "input order does not matter" check is reproducible.
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// The rendered keys of a /transactions row, i.e. a RecentTransactionRow.
function cells({ id, type, dateLabel, ticker, portfolioName, sharesLabel, priceLabel, totalLabel }: TransactionRow): RecentTransactionRow {
  return { id, type, dateLabel, ticker, portfolioName, sharesLabel, priceLabel, totalLabel };
}

const NAMES: ReadonlyMap<string, string> = new Map([
  ["p-retiro", "Retiro"],
  ["p-viajes", "Viajes"],
]);

// Two portfolios, same-day trades and same entry times, so every tiebreak of the canonical order is used.
const HISTORY = [
  tx({ id: "h01", date: "2026-09-01", createdAt: 1, portfolioId: "p-retiro" }),
  tx({ id: "h02", date: "2026-09-02", createdAt: 2, portfolioId: "p-viajes", ticker: "MSFT" }),
  tx({ id: "h03", date: "2026-09-02", createdAt: 3, portfolioId: "p-retiro", type: "SELL" }),
  tx({ id: "h04", date: "2026-09-03", createdAt: 4, portfolioId: "p-viajes", ticker: "VOO", quantity: 2 }),
  tx({ id: "h05", date: "2026-09-04", createdAt: 9, portfolioId: "p-retiro", ticker: "TSLA" }),
  tx({ id: "h06", date: "2026-09-04", createdAt: 9, portfolioId: "p-viajes", ticker: "MSFT", price: 210 }),
  tx({ id: "h07", date: "2026-09-04", createdAt: 5, portfolioId: "p-retiro", type: "SELL", ticker: "TSLA" }),
  tx({ id: "h08", date: "2026-09-03", createdAt: 10, portfolioId: "p-retiro", ticker: "BRK.B" }),
  tx({ id: "h09", date: "2026-08-29", createdAt: 11, portfolioId: "p-viajes" }),
  tx({ id: "h10", date: "2026-09-04", createdAt: 9, portfolioId: "p-retiro", ticker: "AAPL", quantity: 3 }),
];

describe("selectRecentTransactions", () => {
  it("shows the latest 3 transactions", () => {
    expect(RECENT_TRANSACTIONS_LIMIT).toBe(3);
  });

  const t1 = tx({ id: "t1", date: "2026-09-01" });
  const t2 = tx({ id: "t2", date: "2026-09-03" });
  const t3 = tx({ id: "t3", date: "2026-09-02" });
  const t4 = tx({ id: "t4", date: "2026-09-05" });
  const t5 = tx({ id: "t5", date: "2026-09-04" });

  it("picks the latest trade dates whatever the input order", () => {
    expect(ids(selectRecentTransactions([t3, t5, t1, t4, t2], 3))).toEqual(["t4", "t5", "t2"]);
  });

  it("puts the later entry first on the same trade date", () => {
    const a = tx({ id: "a", date: "2026-09-10", createdAt: 100 });
    const b = tx({ id: "b", date: "2026-09-10", createdAt: 200 });
    const c = tx({ id: "c", date: "2026-09-09", createdAt: 300 });
    expect(ids(selectRecentTransactions([a, b, c], 3))).toEqual(["b", "a", "c"]);
  });

  it("puts the greater id first on the same date and entry time", () => {
    const k1 = tx({ id: "k1", date: "2026-09-10", createdAt: 5 });
    const k2 = tx({ id: "k2", date: "2026-09-10", createdAt: 5 });
    const k0 = tx({ id: "k0", date: "2026-09-01", createdAt: 5 });
    expect(ids(selectRecentTransactions([k1, k0, k2], 3))).toEqual(["k2", "k1", "k0"]);
  });

  it("orders by trade date before entry time (a back-dated trade entered last is not recent)", () => {
    const old = tx({ id: "old", date: "2026-08-01", createdAt: 999 });
    const n1 = tx({ id: "n1", date: "2026-09-01", createdAt: 1 });
    const n2 = tx({ id: "n2", date: "2026-09-02", createdAt: 2 });
    const n3 = tx({ id: "n3", date: "2026-09-03", createdAt: 3 });
    expect(ids(selectRecentTransactions([n1, n2, n3, old], 3))).toEqual(["n3", "n2", "n1"]);
  });

  it("returns fewer rows than the limit when the history is short", () => {
    expect(ids(selectRecentTransactions([t1, t3], 3))).toEqual(["t3", "t1"]);
    expect(selectRecentTransactions([], 3)).toEqual([]);
  });

  it.each([0, -1])("returns nothing for limit %i", (limit) => {
    expect(selectRecentTransactions([t1, t2, t3], limit)).toEqual([]);
  });

  it("never mutates the input", () => {
    const input = Object.freeze([t3, t5, t1, t4, t2]);
    expect(ids(selectRecentTransactions(input, 3))).toEqual(["t4", "t5", "t2"]);
    expect(ids(input)).toEqual(["t3", "t5", "t1", "t4", "t2"]);
  });

  it("does not depend on the input order", () => {
    const expected = ids(selectRecentTransactions(HISTORY, 3));
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(ids(selectRecentTransactions(shuffled(HISTORY, seed), 3))).toEqual(expected);
    }
  });

  it("interleaves portfolios by date", () => {
    const p1First = tx({ id: "p1-first", portfolioId: "p-retiro", date: "2026-09-01" });
    const p1Last = tx({ id: "p1-last", portfolioId: "p-retiro", date: "2026-09-03" });
    const p2 = tx({ id: "p2", portfolioId: "p-viajes", date: "2026-09-02" });
    expect(ids(selectRecentTransactions([p1First, p1Last, p2], 3))).toEqual(["p1-last", "p2", "p1-first"]);
  });

  it.each([false, true])(
    "equals the first rows of the default /transactions list (Portfolio column shown: %s)",
    (showPortfolioColumn) => {
      const listed = sortTransactionList(HISTORY, effectiveSort(DEFAULT_LIST_QUERY, showPortfolioColumn), NAMES);
      const recent = selectRecentTransactions(HISTORY, 3);

      expect(ids(recent)).toEqual(ids(listed.slice(0, 3)));
      expect(toRecentTransactionRows(recent, { showPortfolioColumn, portfolioNames: NAMES })).toEqual(
        toTransactionRows(listed, { showPortfolioColumn, portfolioNames: NAMES, listQueryString: "" })
          .slice(0, 3)
          .map(cells),
      );
    },
  );
});

describe("toRecentTransactionRows", () => {
  const hidden = { showPortfolioColumn: false, portfolioNames: NAMES };
  const shown = { showPortfolioColumn: true, portfolioNames: NAMES };
  const aapl = tx({
    id: "t1",
    portfolioId: "p-retiro",
    ticker: "AAPL",
    type: "BUY",
    date: "2024-11-10",
    quantity: 10,
    price: 189.32,
    totalAmount: 1893.2,
    createdAt: 1,
  });

  it("keeps only the rendered cells and the key", () => {
    const [row] = toRecentTransactionRows([aapl], hidden);
    expect(row).toStrictEqual({
      id: "t1",
      type: "BUY",
      dateLabel: "Nov 10, 2024",
      ticker: "AAPL",
      portfolioName: null,
      sharesLabel: "10.0000",
      priceLabel: "$189.32",
      totalLabel: "$1,893.20",
    });
    expect(row).not.toHaveProperty("editHref");
    expect(row).not.toHaveProperty("actionsId");
    expect(row).not.toHaveProperty("description");
  });

  it("names the portfolio in All portfolios", () => {
    expect(toRecentTransactionRows([aapl], shown)[0].portfolioName).toBe("Retiro");
  });

  it("shows a dash for a portfolio that is not loaded", () => {
    expect(toRecentTransactionRows([{ ...aapl, portfolioId: "p-gone" }], shown)[0].portfolioName).toBe("—");
  });

  it("never names the portfolio while the column is hidden", () => {
    expect(toRecentTransactionRows([aapl], hidden)[0].portfolioName).toBeNull();
  });

  it("keeps the sell type", () => {
    expect(toRecentTransactionRows([{ ...aapl, type: "SELL" }], hidden)[0].type).toBe("SELL");
  });

  it("rounds fractional shares and totals for display", () => {
    const [row] = toRecentTransactionRows(
      [tx({ id: "f", quantity: 0.123456789, price: 100, totalAmount: 12.3456789 })],
      hidden,
    );
    expect(row.sharesLabel).toBe("0.1235");
    expect(row.totalLabel).toBe("$12.35");
  });

  it("shows a non-ISO date as stored", () => {
    expect(toRecentTransactionRows([tx({ id: "d", date: "09/01/2026" })], hidden)[0].dateLabel).toBe("09/01/2026");
  });

  it("keeps the input order", () => {
    const older = tx({ id: "older", date: "2026-09-01" });
    const newer = tx({ id: "newer", date: "2026-09-02" });
    expect(ids(toRecentTransactionRows([older, newer], hidden))).toEqual(["older", "newer"]);
  });
});

describe("recentTransactionsCaption", () => {
  it("names the scope and the fixed newest-first order", () => {
    expect(recentTransactionsCaption("all portfolios")).toBe(
      "Recent transactions in all portfolios, sorted by Date descending",
    );
    expect(recentTransactionsCaption("Retiro")).toBe("Recent transactions in Retiro, sorted by Date descending");
  });
});
