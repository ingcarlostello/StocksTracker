import { describe, expect, it, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { AnnualPerformance } from "@/domain/performance/performance.type";
import type { OversellViolation } from "@/domain/transactions/transaction.type";
import type { PortfolioHistoryState } from "@/features/portfolio/portfolio-history.type";
import { blockedPortfolioView } from "@/features/portfolio/portfolio-view.utils";
import type { AnnualPerformanceState, PerformanceViewInput, PerformanceViewState } from "./performance.type";
import { buildPerformanceView, performanceAnnouncement } from "./performance-view.utils";

type ReadyView = Extract<PerformanceViewState, { status: "ready" }>;

const pension = { id: "p-pension" as Id<"portfolios">, name: "Pension", createdAt: 1 };

const readyHistory: PortfolioHistoryState = {
  status: "ready",
  active: { kind: "portfolio", portfolio: pension },
  portfolios: [pension],
  transactions: [],
  positions: [],
};

const onSelectYear = vi.fn();

// The spec example, as the domain would report it.
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

function input(overrides: Partial<PerformanceViewInput> = {}): PerformanceViewInput {
  return {
    history: readyHistory,
    years: [2026, 2025],
    selectedYear: 2026,
    onSelectYear,
    annual: { kind: "loading" },
    scopeLabel: "Pension",
    ...overrides,
  };
}

function readyView(overrides: Partial<PerformanceViewInput> = {}): ReadyView {
  const state = buildPerformanceView(input(overrides));
  if (state.status !== "ready") throw new Error(`expected a ready view, got ${state.status}`);
  return state;
}

describe("the states in which no year is rendered", () => {
  it("shows the shared loading state while the history is not ready", () => {
    expect(buildPerformanceView(input({ history: { status: "loading" } }))).toEqual({ status: "loading" });
  });

  it("sends a user with no portfolios to the same place every other screen does", () => {
    expect(buildPerformanceView(input({ history: { status: "no-portfolios" } }))).toEqual({
      status: "no-portfolios",
    });
  });

  it("reuses /portfolio's invalid-history message byte for byte", () => {
    const violation: OversellViolation = {
      ticker: "AAPL",
      date: "2026-01-02",
      transactionId: "t1",
      available: 1,
      requested: 2,
    };
    expect(buildPerformanceView(input({ history: { status: "invalid-history", violation } }))).toEqual(
      blockedPortfolioView({ status: "invalid-history", violation }),
    );
  });

  it("is empty when the scope has no transactions to measure", () => {
    expect(buildPerformanceView(input({ years: [], selectedYear: null }))).toEqual({ status: "empty" });
  });

  it("never renders a year when none was resolved", () => {
    expect(buildPerformanceView(input({ selectedYear: null }))).toEqual({ status: "empty" });
  });
});

describe("the year select", () => {
  const rateLimited: AnnualPerformanceState = {
    kind: "error",
    message: "Price updates are limited to a few per minute. Try again shortly.",
    canRetry: false,
    isRateLimited: true,
    retry: vi.fn(),
  };

  it("offers every year of the scope, newest first, with the selected one set", () => {
    expect(readyView().year).toEqual({
      value: "2026",
      options: [
        { value: "2026", label: "2026" },
        { value: "2025", label: "2025" },
      ],
      onChange: onSelectYear,
    });
  });

  it("is never disabled: a year already loaded costs no request", () => {
    const year = readyView({ annual: rateLimited }).year;
    expect("disabled" in year).toBe(false);
    expect(year).toEqual(readyView().year);
  });
});

describe("the measured year's content", () => {
  it("is loading while a boundary's closes are in flight", () => {
    const state = readyView();
    expect(state.content).toEqual({ kind: "loading", message: "Loading closing prices…" });
    expect(state.announcement).toBe("Loading 2026 performance.");
  });

  it("offers a retry on a failure that is worth retrying", () => {
    const retry = vi.fn();
    const annual: AnnualPerformanceState = {
      kind: "error",
      message: "The price provider could not be reached.",
      canRetry: true,
      isRateLimited: false,
      retry,
    };
    const state = readyView({ annual });

    expect(state.content).toEqual({
      kind: "error",
      message: "The price provider could not be reached.",
      canRetry: true,
      onRetry: retry,
      cooldownMessage: null,
    });
    // The only interactive control the content can render: it must be the hook's own refetch.
    expect(state.content.kind === "error" && state.content.onRetry).toBe(retry);
    expect(state.announcement).toBe("Could not load 2026 closing prices.");
  });

  it("explains the wait instead, while the provider's rate limit is still running", () => {
    const annual: AnnualPerformanceState = {
      kind: "error",
      message: "Price updates are limited to a few per minute. Try again shortly.",
      canRetry: false,
      isRateLimited: true,
      retry: vi.fn(),
    };
    const content = readyView({ annual }).content;

    expect(content.kind).toBe("error");
    if (content.kind !== "error") return;
    expect(content.canRetry).toBe(false);
    expect(content.cooldownMessage).toBe(
      "Price requests are rate-limited right now. Try again in about a minute.",
    );
  });

  it("renders cards, summary and notes once the year is measured", () => {
    const state = readyView({
      selectedYear: 2025,
      annual: { kind: "ready", performance: performance() },
    });

    expect(state.content.kind).toBe("ready");
    if (state.content.kind !== "ready") return;
    expect(state.content.cards.totalReturn.value.label).toBe("+14.94%");
    expect(state.content.summary.periodLabel).toBe("Jan 1, 2025 – Dec 31, 2025 · Pension");
    expect(state.content.notes).toEqual([]);
    expect(state.announcement).toBe(
      "2025 · Total Return +14.94%, Investment Performance +$1,500.00.",
    );
  });

  it("announces a year whose figures could not be measured in one word", () => {
    const state = readyView({
      selectedYear: 2025,
      annual: {
        kind: "ready",
        performance: performance({
          status: "missing-end-price",
          endValue: null,
          investmentPerformance: null,
          totalReturn: null,
          missingEndTickers: ["AAPL"],
        }),
      },
    });
    expect(state.announcement).toBe("2025 · Total Return unavailable.");
  });
});

describe("performanceAnnouncement", () => {
  it("says nothing for the states that render their own visible text", () => {
    expect(performanceAnnouncement({ status: "loading" })).toBe("");
    expect(performanceAnnouncement({ status: "empty" })).toBe("");
  });
});
