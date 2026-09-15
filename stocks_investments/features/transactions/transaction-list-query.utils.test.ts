import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_QUERY } from "./transaction-list.constants";
import type { TransactionListQuery } from "./transaction-list.type";
import {
  clearListFilters,
  dateRangeError,
  editTransactionHref,
  effectiveSort,
  hasActiveFilters,
  normalizeListQuery,
  parseTransactionListQuery,
  reconcileUrlQuery,
  serializeTransactionListQuery,
  tickerTransactionsHref,
  toggleSort,
  transactionsListHref,
} from "./transaction-list-query.utils";

function parse(query: string): TransactionListQuery {
  return parseTransactionListQuery(new URLSearchParams(query));
}

function query(overrides: Partial<TransactionListQuery> = {}): TransactionListQuery {
  return { ...DEFAULT_LIST_QUERY, ...overrides };
}

describe("parseTransactionListQuery", () => {
  it("returns the defaults for an empty query", () => {
    expect(parse("")).toEqual(DEFAULT_LIST_QUERY);
  });

  it("normalizes the ticker and cuts it to the longest valid ticker", () => {
    expect(parse("ticker=%20brk.b%20").ticker).toBe("BRK.B");
    expect(parse("ticker=abcdefghijkl").ticker).toBe("ABCDEFGHI");
  });

  it.each([
    ["type=BUY", "all"],
    ["type=x", "all"],
    ["type=sell", "sell"],
    ["type=buy", "buy"],
  ])("keeps only a lowercase buy/sell type (%s)", (search, type) => {
    expect(parse(search).type).toBe(type);
  });

  it("drops invalid dates", () => {
    expect(parse("from=2025-02-30&to=yesterday")).toMatchObject({ from: "", to: "" });
    expect(parse("from=2025-01-01&to=2025-02-28")).toMatchObject({ from: "2025-01-01", to: "2025-02-28" });
  });

  it("falls back to date for an unknown sort and to the key's default direction", () => {
    expect(parse("sort=color&dir=up")).toMatchObject({ sort: "date", dir: "desc" });
    expect(parse("sort=ticker")).toMatchObject({ sort: "ticker", dir: "asc" });
    expect(parse("sort=total")).toMatchObject({ sort: "total", dir: "desc" });
    expect(parse("sort=ticker&dir=desc")).toMatchObject({ sort: "ticker", dir: "desc" });
  });

  it("ignores unknown keys", () => {
    expect(parse("page=2&utm_source=x")).toEqual(DEFAULT_LIST_QUERY);
  });
});

describe("normalizeListQuery", () => {
  it("normalizes only the ticker", () => {
    expect(normalizeListQuery(query({ ticker: " brk.b ", type: "sell" }))).toEqual(query({ ticker: "BRK.B", type: "sell" }));
  });
});

describe("serializeTransactionListQuery", () => {
  it("omits every default", () => {
    expect(serializeTransactionListQuery(DEFAULT_LIST_QUERY)).toBe("");
    expect(serializeTransactionListQuery(parse("sort=date&dir=desc"))).toBe("");
  });

  it("keeps a non-default direction alone, which means date ascending", () => {
    expect(serializeTransactionListQuery(query({ dir: "asc" }))).toBe("dir=asc");
    expect(parse("dir=asc")).toEqual(query({ dir: "asc" }));
  });

  it("omits the direction when it is the sort key's default", () => {
    expect(serializeTransactionListQuery(query({ sort: "ticker", dir: "asc" }))).toBe("sort=ticker");
  });

  it("writes keys in a stable order with a normalized ticker", () => {
    const full = { dir: "asc", sort: "total", to: "2025-03-01", from: "2025-01-01", type: "buy", ticker: " brk.b" } as const;
    expect(serializeTransactionListQuery(full)).toBe(
      "ticker=BRK.B&type=buy&from=2025-01-01&to=2025-03-01&sort=total&dir=asc",
    );
  });

  it.each([
    [DEFAULT_LIST_QUERY],
    [query({ ticker: "BRK.B", type: "sell", from: "2025-01-01", to: "2025-01-31" })],
    [query({ sort: "portfolio", dir: "desc" })],
    [query({ sort: "shares", dir: "asc" })],
    [query({ dir: "asc" })],
  ])("parses back to the same normalized query (%j)", (normalized) => {
    expect(parse(serializeTransactionListQuery(normalized))).toEqual(normalized);
  });
});

describe("hrefs", () => {
  it("links to the plain list for the defaults", () => {
    expect(transactionsListHref(DEFAULT_LIST_QUERY)).toBe("/transactions");
    expect(transactionsListHref(query({ type: "sell" }))).toBe("/transactions?type=sell");
  });

  it("encodes the id and carries the list query to the edit page", () => {
    expect(editTransactionHref("a b", "type=sell")).toBe("/transactions/a%20b/edit?type=sell");
    expect(editTransactionHref("abc", "")).toBe("/transactions/abc/edit");
  });

  it("links to the list filtered by one ticker", () => {
    expect(tickerTransactionsHref("AAPL")).toBe("/transactions?ticker=AAPL");
    expect(tickerTransactionsHref("BRK.B")).toBe("/transactions?ticker=BRK.B");
    expect(tickerTransactionsHref(" aapl ")).toBe("/transactions?ticker=AAPL");
  });

  it("round-trips through the list parser", () => {
    expect(parse(tickerTransactionsHref("BRK.B").split("?")[1])).toEqual(query({ ticker: "BRK.B" }));
  });
});

describe("toggleSort", () => {
  it("flips the direction of the current key", () => {
    expect(toggleSort(query(), "date")).toEqual(query({ dir: "asc" }));
    expect(toggleSort(query({ dir: "asc" }), "date")).toEqual(query());
  });

  it("starts a text key ascending", () => {
    expect(toggleSort(query(), "ticker")).toEqual(query({ sort: "ticker", dir: "asc" }));
    expect(toggleSort(query(), "portfolio")).toEqual(query({ sort: "portfolio", dir: "asc" }));
  });

  it("starts a numeric key or the date descending", () => {
    expect(toggleSort(query(), "total")).toEqual(query({ sort: "total", dir: "desc" }));
    expect(toggleSort(query({ sort: "ticker", dir: "asc" }), "date")).toEqual(query({ sort: "date", dir: "desc" }));
  });

  it("keeps the filters", () => {
    expect(toggleSort(query({ ticker: "aa", type: "buy" }), "price")).toMatchObject({ ticker: "aa", type: "buy" });
  });
});

describe("effectiveSort", () => {
  it("falls back to date descending while the Portfolio column is hidden", () => {
    expect(effectiveSort(query({ sort: "portfolio", dir: "asc" }), false)).toEqual({ key: "date", dir: "desc" });
  });

  it("uses the saved sort otherwise", () => {
    expect(effectiveSort(query({ sort: "portfolio", dir: "asc" }), true)).toEqual({ key: "portfolio", dir: "asc" });
    expect(effectiveSort(query({ sort: "ticker", dir: "desc" }), false)).toEqual({ key: "ticker", dir: "desc" });
  });
});

describe("dateRangeError", () => {
  it("reports an end date before the start date", () => {
    expect(dateRangeError(query({ from: "2025-02-01", to: "2025-01-31" }))).toBe(
      "The end date must be on or after the start date.",
    );
  });

  it.each([
    [{ from: "2025-01-31", to: "2025-01-31" }],
    [{ from: "2025-01-01", to: "2025-01-31" }],
    [{ from: "2025-02-01" }],
    [{ to: "2025-01-31" }],
  ])("accepts %j", (overrides) => {
    expect(dateRangeError(query(overrides))).toBeUndefined();
  });
});

describe("hasActiveFilters / clearListFilters", () => {
  it("ignores the sort", () => {
    expect(hasActiveFilters(query({ sort: "ticker", dir: "desc" }))).toBe(false);
  });

  it.each([[{ ticker: "A" }], [{ type: "buy" as const }], [{ from: "2025-01-01" }], [{ to: "2025-01-01" }]])(
    "counts %j as a filter",
    (overrides) => {
      expect(hasActiveFilters(query(overrides))).toBe(true);
    },
  );

  it("clears the filters but keeps the sort", () => {
    const filtered = query({ ticker: "A", type: "sell", from: "2025-01-01", to: "2025-02-01", sort: "total", dir: "asc" });
    expect(clearListFilters(filtered)).toEqual(query({ sort: "total", dir: "asc" }));
  });
});

describe("reconcileUrlQuery", () => {
  it("ignores a URL already seen", () => {
    expect(reconcileUrlQuery({ seenUrl: "ticker=A", pendingWrites: ["ticker=AA"] }, "ticker=A", "ticker=AA")).toEqual({
      kind: "unchanged",
    });
  });

  it("consumes delayed commits of its own writes in order", () => {
    const first = reconcileUrlQuery({ seenUrl: "", pendingWrites: ["A", "AA"] }, "A", "AA");
    expect(first).toEqual({ kind: "own-write", pendingWrites: ["AA"] });
    if (first.kind !== "own-write") return;
    expect(reconcileUrlQuery({ seenUrl: "A", pendingWrites: first.pendingWrites }, "AA", "AA")).toEqual({
      kind: "own-write",
      pendingWrites: [],
    });
  });

  it("drops older writes when commits were batched into the latest one", () => {
    expect(reconcileUrlQuery({ seenUrl: "", pendingWrites: ["A", "AA"] }, "AA", "AA")).toEqual({
      kind: "own-write",
      pendingWrites: [],
    });
  });

  it("converges on an A-B-A sequence batched to its last write", () => {
    expect(reconcileUrlQuery({ seenUrl: "", pendingWrites: ["A", "AA", "A"] }, "A", "A")).toEqual({
      kind: "own-write",
      pendingWrites: [],
    });
  });

  it("treats a URL that caught up with the draft as its own write", () => {
    expect(reconcileUrlQuery({ seenUrl: "type=buy", pendingWrites: [] }, "type=sell", "type=sell")).toEqual({
      kind: "own-write",
      pendingWrites: [],
    });
  });

  it("reports navigation to a URL it never wrote as external", () => {
    expect(reconcileUrlQuery({ seenUrl: "type=sell", pendingWrites: [] }, "", "type=sell")).toEqual({ kind: "external" });
  });
});
