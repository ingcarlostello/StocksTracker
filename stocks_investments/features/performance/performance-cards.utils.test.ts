import { describe, expect, it } from "vitest";
import type { AnnualPerformance } from "@/domain/performance/performance.type";
import { toPerformanceCards } from "./performance-cards.utils";

// The spec example: BV 5 000, +10 000 contributed on 2025-07-01, EV 16 500.
function performance(overrides: Partial<AnnualPerformance> = {}): AnnualPerformance {
  return {
    year: 2025,
    kind: "past",
    status: "ok",
    period: {
      start: "2025-01-01",
      endExclusive: "2026-01-01",
      lastDay: "2025-12-31",
      calendarDays: 365,
      isRebasedStart: false,
      isInProgress: false,
      isClosedOut: false,
    },
    beginValuationDate: "2024-12-31",
    endValuationDate: "2025-12-31",
    beginValue: 5000,
    endValue: 16500,
    contributions: 10000,
    withdrawals: 0,
    cashContributed: 10000,
    investmentPerformance: 1500,
    totalReturn: 0.14938608458390176,
    averageCapital: 10041.09589041096,
    missingBeginTickers: [],
    missingEndTickers: [],
    beginUnavailable: false,
    endUnavailable: false,
    excludedFlows: { count: 0, firstDate: null, net: 0 },
    ...overrides,
  };
}

describe("toPerformanceCards", () => {
  it("names a finished year and reads its measured return", () => {
    const cards = toPerformanceCards(performance());
    expect(cards.totalReturn.label).toBe("Total Return (2025)");
    expect(cards.totalReturn.value).toEqual({ label: "+14.94%", sign: "positive" });
  });

  it("names the year in progress the way the mockup does", () => {
    const cards = toPerformanceCards(performance({ year: 2026, kind: "current" }));
    expect(cards.totalReturn.label).toBe("Total Return (YTD)");
  });

  it("shows contributed cash without a sign colour", () => {
    const cards = toPerformanceCards(performance());
    expect(cards.cashContributed).toEqual({ label: "Cash Contributed", valueLabel: "$10,000.00" });
  });

  it("shows a net seller's negative cash as money moved, not as a loss", () => {
    const cards = toPerformanceCards(performance({ cashContributed: -4700 }));
    expect(cards.cashContributed.valueLabel).toBe("-$4,700.00");
  });

  it("signs the investment performance", () => {
    const cards = toPerformanceCards(performance());
    expect(cards.investmentPerformance.label).toBe("Investment Performance");
    expect(cards.investmentPerformance.value).toEqual({ label: "+$1,500.00", sign: "positive" });
  });

  it("mutes both measured figures when the year could not be measured", () => {
    const cards = toPerformanceCards(
      performance({ status: "missing-end-price", totalReturn: null, investmentPerformance: null }),
    );
    expect(cards.totalReturn.value).toEqual({ label: "—", sign: null });
    expect(cards.investmentPerformance.value).toEqual({ label: "—", sign: null });
  });

  it("captions the method and what the dollar figure leaves out", () => {
    const cards = toPerformanceCards(performance());
    expect(cards.totalReturn.caption).toBe("Modified Dietz");
    expect(cards.investmentPerformance.caption).toBe("Excludes cash contributed");
  });
});
