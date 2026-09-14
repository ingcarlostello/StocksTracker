import { describe, expect, it } from "vitest";
import { sortTransactions } from "@/domain/transactions/transaction-order.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { DEFAULT_LIST_QUERY } from "./transaction-list.constants";
import type { EffectiveSort, TransactionListQuery } from "./transaction-list.type";
import {
  filterTransactions,
  listSummary,
  scopeCaption,
  sortTransactionList,
  toTransactionRows,
  transactionSummary,
} from "./transaction-list.utils";

function tx(overrides: Partial<TransactionLike> & Pick<TransactionLike, "id">): TransactionLike {
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? 100;
  return {
    portfolioId: "p-retiro",
    ticker: "AAPL",
    type: "BUY",
    date: "2025-01-02",
    quantity,
    price,
    totalAmount: quantity * price,
    createdAt: 1,
    ...overrides,
  };
}

function query(overrides: Partial<TransactionListQuery> = {}): TransactionListQuery {
  return { ...DEFAULT_LIST_QUERY, ...overrides };
}

function ids(transactions: readonly TransactionLike[]): string[] {
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

const NAMES: ReadonlyMap<string, string> = new Map([
  ["p-retiro", "Retiro"],
  ["p-viajes", "viajes"],
  ["p-casa", "casa"],
]);

describe("filterTransactions", () => {
  const tickers = [
    tx({ id: "brka", ticker: "BRK.A" }),
    tx({ id: "brkb", ticker: "BRK.B" }),
    tx({ id: "aapl", ticker: "AAPL" }),
    tx({ id: "abnb", ticker: "ABNB" }),
    tx({ id: "t", ticker: "T" }),
  ];

  it("matches a ticker prefix", () => {
    expect(ids(filterTransactions(tickers, query({ ticker: "BRK" })))).toEqual(["brka", "brkb"]);
    expect(ids(filterTransactions(tickers, query({ ticker: "T" })))).toEqual(["t"]);
    expect(ids(filterTransactions(tickers, query({ ticker: "B" })))).toEqual(["brka", "brkb"]);
  });

  const types = [tx({ id: "b", type: "BUY" }), tx({ id: "s", type: "SELL" })];

  it("filters by type", () => {
    expect(ids(filterTransactions(types, query({ type: "buy" })))).toEqual(["b"]);
    expect(ids(filterTransactions(types, query({ type: "sell" })))).toEqual(["s"]);
    expect(ids(filterTransactions(types, query()))).toEqual(["b", "s"]);
  });

  const dated = [
    tx({ id: "jan", date: "2025-01-15" }),
    tx({ id: "feb1", date: "2025-02-01" }),
    tx({ id: "feb28", date: "2025-02-28" }),
    tx({ id: "mar", date: "2025-03-10", ticker: "MSFT", type: "SELL" }),
  ];

  it("includes both date bounds", () => {
    expect(ids(filterTransactions(dated, query({ from: "2025-02-01", to: "2025-02-28" })))).toEqual(["feb1", "feb28"]);
  });

  it("accepts a single bound", () => {
    expect(ids(filterTransactions(dated, query({ from: "2025-02-28" })))).toEqual(["feb28", "mar"]);
    expect(ids(filterTransactions(dated, query({ to: "2025-02-01" })))).toEqual(["jan", "feb1"]);
  });

  it("combines filters", () => {
    expect(ids(filterTransactions(dated, query({ from: "2025-02-01", ticker: "MS", type: "sell" })))).toEqual(["mar"]);
    expect(ids(filterTransactions(dated, query({ from: "2025-02-01", ticker: "MS", type: "buy" })))).toEqual([]);
  });

  it("returns nothing for an inverted range", () => {
    expect(filterTransactions(dated, query({ from: "2025-03-01", to: "2025-01-01" }))).toEqual([]);
  });

  it("excludes non-ISO dates only while a bound is set", () => {
    const withBadDate = [...dated, tx({ id: "bad", date: "01/02/2025" })];
    expect(ids(filterTransactions(withBadDate, query()))).toContain("bad");
    expect(ids(filterTransactions(withBadDate, query({ from: "2000-01-01" })))).not.toContain("bad");
    expect(ids(filterTransactions(withBadDate, query({ to: "2999-01-01" })))).not.toContain("bad");
  });
});

describe("sortTransactionList", () => {
  const history = [
    tx({ id: "a", date: "2025-01-02", createdAt: 1, ticker: "MSFT", quantity: 2, price: 50, portfolioId: "p-viajes" }),
    tx({ id: "b", date: "2025-01-02", createdAt: 2, ticker: "AAPL", quantity: 1, price: 100, portfolioId: "p-retiro" }),
    tx({ id: "c", date: "2025-01-01", createdAt: 3, ticker: "AAPL", quantity: 3, price: 100, type: "SELL", portfolioId: "p-casa" }),
    tx({ id: "d", date: "2025-01-03", createdAt: 4, ticker: "MSFT", quantity: 1, price: 50, portfolioId: "p-retiro" }),
    tx({ id: "e", date: "2025-01-02", createdAt: 2, ticker: "TSLA", quantity: 1, price: 100, type: "SELL", portfolioId: "p-gone" }),
  ];

  function sorted(sort: EffectiveSort, transactions: readonly TransactionLike[] = history): string[] {
    return ids(sortTransactionList(transactions, sort, NAMES));
  }

  it("sorts dates ascending in canonical order, including same-day entry time and id", () => {
    expect(sorted({ key: "date", dir: "asc" })).toEqual(ids(sortTransactions(history)));
    expect(sorted({ key: "date", dir: "asc" })).toEqual(["c", "a", "b", "e", "d"]);
  });

  it("sorts dates descending as the reversed canonical order", () => {
    expect(sorted({ key: "date", dir: "desc" })).toEqual(ids(sortTransactions(history)).reverse());
  });

  it("breaks ticker ties newest first in both directions", () => {
    expect(sorted({ key: "ticker", dir: "asc" })).toEqual(["b", "c", "d", "a", "e"]);
    expect(sorted({ key: "ticker", dir: "desc" })).toEqual(["e", "d", "a", "b", "c"]);
  });

  it("keeps each portfolio's rows together when two names differ only by accents", () => {
    const names = new Map([
      ["p-cafe", "Cafe"],
      ["p-cafe-accent", "Café"],
    ]);
    const rows = [
      tx({ id: "a", date: "2025-01-01", createdAt: 1, portfolioId: "p-cafe" }),
      tx({ id: "b", date: "2025-01-02", createdAt: 2, portfolioId: "p-cafe-accent" }),
      tx({ id: "c", date: "2025-01-03", createdAt: 3, portfolioId: "p-cafe" }),
    ];
    expect(ids(sortTransactionList(rows, { key: "portfolio", dir: "asc" }, names))).toEqual(["c", "a", "b"]);
    expect(ids(sortTransactionList(rows, { key: "portfolio", dir: "desc" }, names))).toEqual(["b", "c", "a"]);
  });

  it("sorts by type with ties newest first", () => {
    expect(sorted({ key: "type", dir: "asc" })).toEqual(["d", "b", "a", "e", "c"]);
  });

  it("breaks price and total ties newest first", () => {
    expect(sorted({ key: "price", dir: "desc" })).toEqual(["e", "b", "c", "d", "a"]);
    expect(sorted({ key: "total", dir: "asc" })).toEqual(["d", "e", "b", "a", "c"]);
  });

  it("compares raw share counts that display identically", () => {
    const close = [tx({ id: "low", quantity: 0.12345, createdAt: 2 }), tx({ id: "high", quantity: 0.12346, createdAt: 1 })];
    expect(sorted({ key: "shares", dir: "asc" }, close)).toEqual(["low", "high"]);
    expect(sorted({ key: "shares", dir: "desc" }, close)).toEqual(["high", "low"]);
  });

  it("sorts portfolio names case-insensitively with unknown portfolios last in both directions", () => {
    expect(sorted({ key: "portfolio", dir: "asc" })).toEqual(["c", "d", "b", "a", "e"]);
    expect(sorted({ key: "portfolio", dir: "desc" })).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("gives the same output for shuffled input", () => {
    const sorts: EffectiveSort[] = [
      { key: "date", dir: "desc" },
      { key: "ticker", dir: "asc" },
      { key: "portfolio", dir: "desc" },
      { key: "total", dir: "asc" },
    ];
    for (const sort of sorts) {
      for (const seed of [1, 7, 42]) {
        expect(sorted(sort, shuffled(history, seed))).toEqual(sorted(sort));
      }
    }
  });

  it("keeps the relative order of the other rows when an equal-key row arrives", () => {
    const before = sorted({ key: "price", dir: "desc" });
    const after = sorted({ key: "price", dir: "desc" }, [...history, tx({ id: "f", price: 100, createdAt: 9 })]);
    expect(after.filter((id) => id !== "f")).toEqual(before);
  });

  it("does not mutate the input", () => {
    const input = [...history];
    sortTransactionList(input, { key: "ticker", dir: "asc" }, NAMES);
    expect(ids(input)).toEqual(ids(history));
  });
});

describe("toTransactionRows", () => {
  const buy = tx({
    id: "t1",
    ticker: "AAPL",
    type: "BUY",
    date: "2024-11-10",
    quantity: 10,
    price: 186,
    totalAmount: 1860.004,
    portfolioId: "p-retiro",
  });
  const sell = tx({ id: "t2", type: "SELL", date: "2024-11-12", quantity: 2.5, price: 190.1, portfolioId: "p-gone" });

  it("formats every label for the table", () => {
    const [row] = toTransactionRows([buy], { showPortfolioColumn: false, portfolioNames: NAMES, listQueryString: "" });
    expect(row).toEqual({
      id: "t1",
      type: "BUY",
      dateLabel: "Nov 10, 2024",
      ticker: "AAPL",
      portfolioName: null,
      sharesLabel: "10.0000",
      priceLabel: "$186.00",
      totalLabel: "$1,860.00",
      description: "Buy 10.0000 AAPL on Nov 10, 2024",
      editHref: "/transactions/t1/edit",
      actionsId: "transaction-t1",
    });
  });

  it("labels a sell", () => {
    const [row] = toTransactionRows([sell], { showPortfolioColumn: false, portfolioNames: NAMES, listQueryString: "" });
    expect(row).toMatchObject({ type: "SELL", sharesLabel: "2.5000", priceLabel: "$190.10" });
  });

  it("names the portfolio in the combined view, with a dash for an unknown one", () => {
    const rows = toTransactionRows([buy, sell], {
      showPortfolioColumn: true,
      portfolioNames: NAMES,
      listQueryString: "type=sell&sort=ticker",
    });
    expect(rows[0]).toMatchObject({
      portfolioName: "Retiro",
      description: "Buy 10.0000 AAPL on Nov 10, 2024 in Retiro",
      editHref: "/transactions/t1/edit?type=sell&sort=ticker",
    });
    expect(rows[1]).toMatchObject({
      portfolioName: "—",
      description: "Sell 2.5000 AAPL on Nov 12, 2024",
      editHref: "/transactions/t2/edit?type=sell&sort=ticker",
    });
  });
});

describe("transactionSummary", () => {
  it("shows the exact share count and the portfolio", () => {
    const transaction = tx({ id: "t1", type: "SELL", date: "2024-11-10", quantity: 0.12346, price: 186.255, portfolioId: "p-viajes" });
    expect(transactionSummary(transaction, NAMES)).toEqual({
      type: "SELL",
      ticker: "AAPL",
      sharesLabel: "0.12346",
      priceLabel: "$186.26",
      totalLabel: "$23.00",
      dateLabel: "Nov 10, 2024",
      portfolioName: "viajes",
    });
    expect(transactionSummary({ ...transaction, portfolioId: "p-gone" }, NAMES).portfolioName).toBe("—");
  });
});

describe("list texts", () => {
  it("summarizes the visible count", () => {
    expect(listSummary(3, 12)).toBe("Showing 3 of 12 transactions");
    expect(listSummary(1, 1)).toBe("Showing 1 of 1 transaction");
    expect(listSummary(0, 1)).toBe("Showing 0 of 1 transaction");
  });

  it("captions the table with scope and sort", () => {
    expect(scopeCaption("all portfolios", { key: "date", dir: "desc" })).toBe(
      "Transactions in all portfolios, sorted by Date descending",
    );
    expect(scopeCaption("Retiro", { key: "total", dir: "asc" })).toBe("Transactions in Retiro, sorted by Total ascending");
  });
});
