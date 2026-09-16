import { describe, expect, it } from "vitest";
import { buildAnnualPerformance } from "@/domain/performance/annual-performance.service";
import type { AnnualPerformanceInput, BoundaryValuation } from "@/domain/performance/performance.type";
import type { PriceMap } from "@/domain/portfolio/portfolio.type";
import type { TransactionLike, TransactionType } from "@/domain/transactions/transaction.type";
import { performanceNotes } from "./performance-notes.utils";

function makeFactory() {
  let sequence = 0;
  return function tx(
    type: TransactionType,
    ticker: string,
    quantity: number,
    price: number,
    date: string,
  ): TransactionLike {
    sequence += 1;
    return {
      id: `t${sequence}`,
      portfolioId: "p-retiro",
      ticker,
      type,
      date,
      quantity,
      price,
      totalAmount: quantity * price,
      createdAt: sequence,
    };
  };
}

function closes(asOfDate: string, prices: PriceMap): BoundaryValuation {
  return { kind: "closes", asOfDate, prices };
}

function noPositions(date: string): BoundaryValuation {
  return { kind: "no-positions", date };
}

function notesOf(input: AnnualPerformanceInput): string[] {
  return performanceNotes(buildAnnualPerformance(input));
}

describe("a year with nothing in it", () => {
  const tx = makeFactory();

  it("says the year had no holdings and no trades", () => {
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 10, 100, "2022-01-05"), tx("SELL", "X", 10, 110, "2022-06-01")],
        year: 2023,
        kind: "past",
        begin: noPositions("2022-12-31"),
        end: noPositions("2023-12-31"),
      }),
    ).toEqual(["No holdings at the start of 2023 and no trades during the year."]);
  });
});

describe("a year whose first close has not been published yet", () => {
  it("explains that the latest close still belongs to the previous year", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "A", 5, 100, "2027-01-02")],
        year: 2027,
        kind: "current",
        begin: noPositions("2026-12-31"),
        end: closes("2026-12-31", { A: 90 }),
      }),
    ).toEqual([
      "The latest published close (Dec 31, 2026) is before 2027 began, so 2027 has nothing to measure yet.",
      "1 trade dated after Dec 31, 2026 (+$500.00 net) isn't included yet; it counts once that day's close is published.",
    ]);
  });

  it("explains that every trade of the year is still after the latest close", () => {
    const tx = makeFactory();
    const notes = notesOf({
      transactions: [tx("BUY", "A", 10, 100, "2026-09-15"), tx("BUY", "B", 5, 200, "2026-09-16")],
      year: 2026,
      kind: "current",
      begin: noPositions("2025-12-31"),
      end: closes("2026-09-14", { A: 95, B: 190 }),
    });

    expect(notes).toEqual([
      "Every 2026 trade is dated after the latest published close (Sep 14, 2026), so 2026 has nothing to measure yet.",
      "2 trades dated after Sep 14, 2026 (+$2,000.00 net) aren't included yet; they count once that day's close is published.",
    ]);
    // Nothing is held at the valuation date, but the year has no flows: the period was not trimmed.
    expect(notes.some((note) => note.startsWith("Nothing was held after"))).toBe(false);
  });
});

describe("a boundary that could not be valued", () => {
  it("names the tickers with no close on each side", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 10, 100, "2024-01-02"), tx("BUY", "Y", 5, 50, "2025-06-01")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", {}),
        end: closes("2025-12-31", { X: 110 }),
      }),
    ).toEqual([
      "No close for X on Dec 31, 2024, so Starting Value, Investment Performance and Total Return can't be calculated. Cash Contributed is still exact.",
      "No close for Y on Dec 31, 2025, so Ending Value, Investment Performance and Total Return can't be calculated.",
    ]);
  });

  it("names the history window when the closes are older than the plan provides", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 1, 180, "2023-11-15"), tx("BUY", "X", 10, 150, "2024-12-02")],
        year: 2024,
        kind: "past",
        begin: { kind: "unavailable", date: "2023-12-31" },
        end: { kind: "unavailable", date: "2024-12-31" },
      }),
    ).toEqual([
      "Closes for the end of 2023 are older than the history the market data plan provides, so 2024's Starting Value can't be calculated. Cash Contributed is still exact.",
      "Closes for the end of 2024 are older than the history the market data plan provides, so 2024's Ending Value can't be calculated.",
    ]);
  });
});

describe("a sale larger than the capital that was invested", () => {
  it("explains the undefined base, and the shortened period that produced it", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 10, 100, "2024-05-01"), tx("SELL", "X", 10, 300, "2025-01-02")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", { X: 100 }),
        end: noPositions("2025-12-31"),
      }),
    ).toEqual([
      "Total Return can't be calculated for 2025: sells withdrew more than the capital that was invested on average, so Modified Dietz has no positive base. The dollar figures are exact.",
      "Nothing was held after Jan 2, 2025, so Total Return measures Jan 1, 2025 – Jan 2, 2025 — the span in which capital was actually invested — instead of the full period. Every trade of the year is included and the dollar figures are unchanged.",
    ]);
  });
});

describe("a year that was closed out", () => {
  it("explains the shortened period of a finished year", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 50, 100, "2024-03-01"), tx("SELL", "X", 50, 110, "2025-03-01")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", { X: 100 }),
        end: noPositions("2025-12-31"),
      }),
    ).toEqual([
      "Nothing was held after Mar 1, 2025, so Total Return measures Jan 1, 2025 – Mar 1, 2025 — the span in which capital was actually invested — instead of the full period. Every trade of the year is included and the dollar figures are unchanged.",
    ]);
  });

  it("explains it the same way when both ends of the period were trimmed", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "Y", 10, 100, "2026-02-02"), tx("SELL", "Y", 10, 110, "2026-03-02")],
        year: 2026,
        kind: "current",
        begin: noPositions("2025-12-31"),
        end: noPositions("2026-09-14"),
      }),
    ).toEqual([
      "Nothing was held after Mar 2, 2026, so Total Return measures Feb 2, 2026 – Mar 2, 2026 — the span in which capital was actually invested — instead of the full period. Every trade of the year is included and the dollar figures are unchanged.",
    ]);
  });
});

describe("a year that needs no explanation", () => {
  it("shows no note at all", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "AAPL", 50, 80, "2024-06-03"), tx("BUY", "AAPL", 100, 100, "2025-07-01")],
        year: 2025,
        kind: "past",
        begin: closes("2024-12-31", { AAPL: 100 }),
        end: closes("2025-12-31", { AAPL: 110 }),
      }),
    ).toEqual([]);
  });
});

describe("trades dated after the valuation date of a measured year", () => {
  it("reports them, their net amount, and when they will count", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 10, 100, "2026-03-02"), tx("BUY", "X", 1, 200, "2026-09-15")],
        year: 2026,
        kind: "current",
        begin: noPositions("2025-12-31"),
        end: closes("2026-09-14", { X: 150 }),
      }),
    ).toEqual([
      "1 trade dated after Sep 14, 2026 (+$200.00 net) isn't included yet; it counts once that day's close is published.",
    ]);
  });

  // The end boundary is never queried when nothing is held at the valuation date, so no close date comes
  // back; without the period's last day standing in, the trades the user just entered went unexplained.
  it("reports them even when no boundary was priced", () => {
    const tx = makeFactory();
    expect(
      notesOf({
        transactions: [tx("BUY", "X", 10, 100, "2026-09-15"), tx("SELL", "X", 10, 105, "2026-09-15")],
        year: 2026,
        kind: "current",
        begin: noPositions("2025-12-31"),
        end: noPositions("2026-09-14"),
      }),
    ).toEqual([
      "Every 2026 trade is dated after the latest published close (Sep 14, 2026), so 2026 has nothing to measure yet.",
      "2 trades dated after Sep 14, 2026 (-$50.00 net) aren't included yet; they count once that day's close is published.",
    ]);
  });

  // "Every trade of the year is included" would contradict the excluded-trades note that follows it.
  it("drops the closed-out note's every-trade claim when a trade sits outside the period", () => {
    const tx = makeFactory();
    const notes = notesOf({
      transactions: [
        tx("BUY", "X", 10, 100, "2026-02-02"),
        tx("SELL", "X", 10, 110, "2026-03-02"),
        tx("BUY", "X", 2, 130, "2026-09-15"),
      ],
      year: 2026,
      kind: "current",
      begin: noPositions("2025-12-31"),
      end: closes("2026-09-14", { X: 150 }),
    });

    expect(notes).toEqual([
      "Nothing was held from Mar 2, 2026 to the latest published close, so Total Return measures Feb 2, 2026 – Mar 2, 2026 — the span in which capital was actually invested — instead of the full period. The dollar figures are unchanged.",
      "1 trade dated after Sep 14, 2026 (+$260.00 net) isn't included yet; it counts once that day's close is published.",
    ]);
  });
});
