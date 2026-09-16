import { describe, expect, it } from "vitest";
import { buildAnnualPerformance } from "@/domain/performance/annual-performance.service";
import type { AnnualPerformanceInput, BoundaryValuation } from "@/domain/performance/performance.type";
import type { PriceMap } from "@/domain/portfolio/portfolio.type";
import type { TransactionLike, TransactionType } from "@/domain/transactions/transaction.type";
import { performanceValuationLabel, toPerformanceSummary } from "./performance-summary.utils";

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

function summaryOf(input: AnnualPerformanceInput, scopeLabel = "Pension") {
  return toPerformanceSummary(buildAnnualPerformance(input), scopeLabel);
}

function labels(rows: { label: string; value: { label: string } }[]): string[][] {
  return rows.map((row) => [row.label, row.value.label]);
}

describe("a finished year valued at both year ends", () => {
  const tx = makeFactory();
  const summary = summaryOf({
    transactions: [tx("BUY", "AAPL", 50, 80, "2024-06-03"), tx("BUY", "AAPL", 100, 100, "2025-07-01")],
    year: 2025,
    kind: "past",
    // Dec 31 2024 was a trading day; a weekend year end would look exactly like this Dec 30 close.
    begin: closes("2024-12-30", { AAPL: 100 }),
    end: closes("2025-12-31", { AAPL: 110 }),
  });

  it("names the card and its footnote in the app's own vocabulary", () => {
    expect(summary.title).toBe("Performance Summary");
    expect(summary.footnote).toBe("Performance takes into account all buys and sells during the period.");
  });

  it("dates the period and names the scope it belongs to", () => {
    expect(summary.periodLabel).toBe("Jan 1, 2025 – Dec 31, 2025 · Pension");
    expect(summary.periodNote).toBeNull();
  });

  it("lists the five rows the mockup shows, in the period's own dates", () => {
    expect(labels(summary.rows)).toEqual([
      ["Starting Value (Jan 1, 2025)", "$5,000.00"],
      ["Cash Contributed", "$10,000.00"],
      ["Ending Value (Dec 31, 2025)", "$16,500.00"],
      ["Investment Performance", "+$1,500.00"],
      ["Total Return (Modified Dietz)", "+14.94%"],
    ]);
  });

  it("colours only the two measured rows", () => {
    expect(summary.rows.map((row) => row.value.sign)).toEqual([
      "zero",
      "zero",
      "zero",
      "positive",
      "positive",
    ]);
  });

  it("names both closes the values came from", () => {
    expect(summary.valuationLabel).toBe("Valued at the closes of Dec 30, 2024 and Dec 31, 2025.");
  });
});

describe("a year in progress that started with nothing", () => {
  const tx = makeFactory();
  const summary = summaryOf({
    transactions: [tx("BUY", "NVDA", 0.7692307692307693, 130, "2026-07-06")],
    year: 2026,
    kind: "current",
    begin: noPositions("2025-12-31"),
    end: closes("2026-09-14", { NVDA: 210.96 }),
  });

  it("measures from the first trade to the latest published close", () => {
    expect(summary.periodLabel).toBe("Jul 6, 2026 – Sep 14, 2026 · Pension");
    expect(summary.periodNote).toBe("measured from your first trade of the year · in progress");
  });

  it("dates both value rows at the period's own ends", () => {
    expect(labels(summary.rows).slice(0, 3)).toEqual([
      ["Starting Value (Jul 6, 2026)", "$0.00"],
      ["Cash Contributed", "$100.00"],
      ["Ending Value (Sep 14, 2026)", "$162.28"],
    ]);
  });

  it("names the only close that was needed", () => {
    expect(summary.valuationLabel).toBe("Valued at the Sep 14, 2026 close.");
  });
});

describe("a closed-out past year", () => {
  const tx = makeFactory();
  const summary = summaryOf({
    transactions: [tx("BUY", "X", 50, 100, "2024-03-01"), tx("SELL", "X", 50, 110, "2025-03-01")],
    year: 2025,
    kind: "past",
    begin: closes("2024-12-31", { X: 100 }),
    end: noPositions("2025-12-31"),
  });

  it("ends the period at the sale that closed the position", () => {
    expect(summary.periodLabel).toBe("Jan 1, 2025 – Mar 1, 2025 · Pension");
    expect(labels(summary.rows)).toEqual([
      ["Starting Value (Jan 1, 2025)", "$5,000.00"],
      ["Cash Contributed", "-$5,500.00"],
      ["Ending Value (Mar 1, 2025)", "$0.00"],
      ["Investment Performance", "+$500.00"],
      ["Total Return (Modified Dietz)", "+10.19%"],
    ]);
  });
});

describe("a current year opened and closed inside itself", () => {
  const tx = makeFactory();
  const summary = summaryOf(
    {
      transactions: [tx("BUY", "Y", 10, 100, "2026-02-02"), tx("SELL", "Y", 10, 110, "2026-03-02")],
      year: 2026,
      kind: "current",
      begin: noPositions("2025-12-31"),
      end: noPositions("2026-09-14"),
    },
    "all portfolios",
  );

  it("measures from the first trade to the last one, in the combined scope", () => {
    expect(summary.periodLabel).toBe("Feb 2, 2026 – Mar 2, 2026 · all portfolios");
    expect(labels(summary.rows).slice(0, 3)).toEqual([
      ["Starting Value (Feb 2, 2026)", "$0.00"],
      ["Cash Contributed", "-$100.00"],
      ["Ending Value (Mar 2, 2026)", "$0.00"],
    ]);
  });

  it("keeps the year itself in progress: a new buy would extend the period again", () => {
    expect(summary.periodNote).toBe("measured from your first trade of the year · in progress");
  });

  it("names no close at all when neither boundary held anything", () => {
    expect(summary.valuationLabel).toBeNull();
  });
});

describe("a year with nothing to measure yet", () => {
  const tx = makeFactory();
  const summary = summaryOf({
    transactions: [tx("BUY", "A", 10, 100, "2026-09-15")],
    year: 2026,
    kind: "current",
    begin: noPositions("2025-12-31"),
    end: closes("2026-09-14", { A: 95 }),
  });

  it("says so next to the calendar period it fell back to", () => {
    expect(summary.periodLabel).toBe("Jan 1, 2026 – Sep 14, 2026 · Pension");
    expect(summary.periodNote).toBe("in progress · nothing measured yet");
  });
});

describe("a boundary that cannot be valued", () => {
  const tx = makeFactory();
  const summary = summaryOf({
    transactions: [tx("BUY", "X", 1, 180, "2023-11-15"), tx("BUY", "X", 10, 150, "2024-12-02")],
    year: 2024,
    kind: "past",
    begin: { kind: "unavailable", date: "2023-12-31" },
    end: closes("2024-12-31", { X: 200 }),
  });

  it("mutes every figure that needed the missing side, and keeps the cash exact", () => {
    expect(labels(summary.rows)).toEqual([
      ["Starting Value (Jan 1, 2024)", "—"],
      ["Cash Contributed", "$1,500.00"],
      ["Ending Value (Dec 31, 2024)", "$2,200.00"],
      ["Investment Performance", "—"],
      ["Total Return (Modified Dietz)", "—"],
    ]);
    expect(summary.rows.map((row) => row.value.sign)).toEqual([null, "zero", "zero", null, null]);
  });
});

describe("performanceValuationLabel", () => {
  const tx = makeFactory();
  const base = {
    transactions: [tx("BUY", "X", 10, 100, "2025-02-03")],
    year: 2025,
    kind: "past",
  } as const;

  it("names the ending close alone when the year started with nothing", () => {
    const performance = buildAnnualPerformance({
      ...base,
      begin: noPositions("2024-12-31"),
      end: closes("2025-12-31", { X: 120 }),
    });
    expect(performanceValuationLabel(performance)).toBe("Valued at the Dec 31, 2025 close.");
  });

  it("names nothing when no boundary was priced", () => {
    const performance = buildAnnualPerformance({
      ...base,
      begin: noPositions("2024-12-31"),
      end: { kind: "unavailable", date: "2025-12-31" },
    });
    expect(performanceValuationLabel(performance)).toBeNull();
  });
});
