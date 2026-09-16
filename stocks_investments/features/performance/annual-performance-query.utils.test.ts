import { beforeEach, describe, expect, it, vi } from "vitest";
import { planAnnualValuation } from "@/domain/performance/annual-valuation.service";
import type { AnnualValuationPlan, BoundarySpec } from "@/domain/performance/performance.type";
import type { TransactionLike, TransactionType } from "@/domain/transactions/transaction.type";
import { PRICES_ERROR_MESSAGES } from "@/features/market-data/prices-messages.constants";
import { PricesApiError } from "@/features/market-data/prices.errors";
import type { PricesResponse } from "@/types/prices-response.type";
import {
  annualPerformanceArgs,
  blockingBoundarySide,
  boundaryQueryOptions,
  idleBoundarySpecs,
  resolveAnnualPerformance,
  resolveBoundary,
} from "./annual-performance-query.utils";
import type { BoundaryQueryResult } from "./performance.type";

// The idle contract says the domain is never reached; only the call count is observed.
vi.mock("@/domain/performance/annual-valuation.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/domain/performance/annual-valuation.service")>();
  return { ...actual, planAnnualValuation: vi.fn(actual.planAnnualValuation) };
});

beforeEach(() => {
  vi.clearAllMocks();
});

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

function queryResult(overrides: Partial<BoundaryQueryResult> = {}): BoundaryQueryResult {
  return {
    data: undefined,
    error: null,
    isPending: true,
    isFetching: false,
    isPlaceholderData: false,
    ...overrides,
  };
}

function response(asOfDate: string, prices: Record<string, number>): PricesResponse {
  return { asOfDate, prices, missing: [], fetchedAt: 1 };
}

const yearEndSpec: BoundarySpec = { kind: "year-end-closes", year: 2024, symbols: ["AAPL"] };
const currentSpec: BoundarySpec = {
  kind: "current-closes",
  symbols: ["MSFT", "AAPL"],
  fallbackDate: "2026-09-14",
};
const noPositionsSpec: BoundarySpec = { kind: "no-positions", date: "2024-12-31" };

describe("boundaryQueryOptions", () => {
  it("prices a year end through the immutable year-end cache entry", () => {
    const options = boundaryQueryOptions(yearEndSpec, "begin");
    expect(options.queryKey).toEqual(["prices", "year-end", 2024, ["AAPL"]]);
    expect(options.enabled).toBe(true);
    expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);
  });

  it("prices the year in progress through the same key the dashboard uses", () => {
    const options = boundaryQueryOptions(currentSpec, "end");
    expect(options.queryKey).toEqual(["prices", "current", ["AAPL", "MSFT"]]);
    expect(options.enabled).toBe(true);
  });

  it("never lets another year's closes stand in as placeholder data", () => {
    const options = boundaryQueryOptions(currentSpec, "end");
    expect("placeholderData" in options ? options.placeholderData : "absent").toBeUndefined();
  });

  it("keeps a boundary with nothing to price disabled, on a key of its own", () => {
    const options = boundaryQueryOptions(noPositionsSpec, "begin");
    expect(options.queryKey).toEqual(["performance", "no-positions", "begin", "2024-12-31"]);
    expect(options.enabled).toBe(false);
  });

  // Two disabled slots sharing one key make TanStack log "Duplicate Queries found" on every render of a
  // year whose boundaries both hold no positions.
  it("gives the two slots different keys even when both price nothing on the same date", () => {
    const begin = boundaryQueryOptions(noPositionsSpec, "begin");
    const end = boundaryQueryOptions(noPositionsSpec, "end");
    expect(begin.queryKey).not.toEqual(end.queryKey);
  });
});

describe("resolveBoundary", () => {
  it("values a boundary with no positions without ever querying", () => {
    expect(resolveBoundary(noPositionsSpec, queryResult())).toEqual({
      kind: "no-positions",
      date: "2024-12-31",
    });
  });

  it("is loading while the closes are pending", () => {
    expect(resolveBoundary(yearEndSpec, queryResult())).toEqual({ kind: "loading" });
  });

  it("is loading while the slot only holds placeholder data", () => {
    const result = queryResult({
      data: response("2023-12-29", { AAPL: 100 }),
      isPending: false,
      isPlaceholderData: true,
    });
    expect(resolveBoundary(yearEndSpec, result)).toEqual({ kind: "loading" });
  });

  it("reads the closes the response carried", () => {
    const result = queryResult({ data: response("2024-12-31", { AAPL: 190 }), isPending: false });
    expect(resolveBoundary(yearEndSpec, result)).toEqual({
      kind: "ready",
      asOfDate: "2024-12-31",
      prices: { AAPL: 190 },
    });
  });

  it("keeps the closes it already has when a later refetch fails", () => {
    const result = queryResult({
      data: response("2024-12-31", { AAPL: 190 }),
      error: new PricesApiError("RATE_LIMITED", "too many"),
      isPending: false,
    });
    expect(resolveBoundary(yearEndSpec, result)).toEqual({
      kind: "ready",
      asOfDate: "2024-12-31",
      prices: { AAPL: 190 },
    });
  });

  it("reports closes outside the provider's history as unavailable, not as an error", () => {
    const result = queryResult({
      error: new PricesApiError("PRICE_HISTORY_UNAVAILABLE", "too old", 404),
      isPending: false,
    });
    expect(resolveBoundary(yearEndSpec, result)).toEqual({ kind: "unavailable", date: "2024-12-31" });
  });

  it("dates an unavailable current boundary at the valuation date that stood in", () => {
    const result = queryResult({
      error: new PricesApiError("PRICE_HISTORY_UNAVAILABLE", "too old", 404),
      isPending: false,
    });
    expect(resolveBoundary(currentSpec, result)).toEqual({
      kind: "unavailable",
      date: "2026-09-14",
    });
  });

  it("flags a rate limit so the retry can be gated", () => {
    const result = queryResult({
      error: new PricesApiError("RATE_LIMITED", "too many", 429, 60),
      isPending: false,
    });
    expect(resolveBoundary(yearEndSpec, result)).toEqual({
      kind: "error",
      message: PRICES_ERROR_MESSAGES.RATE_LIMITED,
      isRateLimited: true,
    });
  });

  it("turns any other rejection into a sentence through the shared mapper", () => {
    const result = queryResult({ error: new Error("boom"), isPending: false });
    expect(resolveBoundary(yearEndSpec, result)).toEqual({
      kind: "error",
      message: PRICES_ERROR_MESSAGES.INTERNAL_ERROR,
      isRateLimited: false,
    });
  });
});

describe("blockingBoundarySide", () => {
  const ready = { kind: "ready", asOfDate: "2024-12-31", prices: { AAPL: 190 } } as const;
  const unavailable = { kind: "unavailable", date: "2023-12-29" } as const;
  const rateLimited = { kind: "error", message: PRICES_ERROR_MESSAGES.RATE_LIMITED, isRateLimited: true } as const;

  it("names the begin boundary when it is the one that failed", () => {
    expect(blockingBoundarySide(rateLimited, ready)).toBe("begin");
  });

  // An unavailable boundary keeps the rejection that produced it, so selecting by query error would feed
  // the 429 cooldown a permanent 404: the retry would be enabled during the rate-limit window and would
  // refetch a boundary that can never succeed.
  it("skips a boundary the plan will never serve and names the one that failed", () => {
    expect(blockingBoundarySide(unavailable, rateLimited)).toBe("end");
  });

  it("names nothing when both boundaries settled", () => {
    expect(blockingBoundarySide(unavailable, ready)).toBeNull();
    expect(blockingBoundarySide(ready, { kind: "no-positions", date: "2025-12-31" })).toBeNull();
  });
});

describe("resolveAnnualPerformance", () => {
  const tx = makeFactory();
  const history = [tx("BUY", "AAPL", 50, 100, "2024-06-03"), tx("BUY", "AAPL", 10, 120, "2025-07-01")];
  const plan: AnnualValuationPlan = {
    year: 2025,
    kind: "past",
    positionsBeginDate: "2024-12-31",
    positionsEndDate: "2025-12-31",
    begin: { kind: "year-end-closes", year: 2024, symbols: ["AAPL"] },
    end: { kind: "year-end-closes", year: 2025, symbols: ["AAPL"] },
  };
  const beginReady = { kind: "ready", asOfDate: "2024-12-31", prices: { AAPL: 100 } } as const;
  const endReady = { kind: "ready", asOfDate: "2025-12-31", prices: { AAPL: 130 } } as const;

  it("waits while any needed boundary is still loading", () => {
    expect(resolveAnnualPerformance(plan, history, { kind: "loading" }, endReady)).toEqual({
      kind: "loading",
    });
    expect(resolveAnnualPerformance(plan, history, beginReady, { kind: "loading" })).toEqual({
      kind: "loading",
    });
  });

  it("blocks the year on a boundary that failed, carrying its rate-limit flag", () => {
    const failed = { kind: "error", message: "nope", isRateLimited: true } as const;
    expect(resolveAnnualPerformance(plan, history, failed, endReady)).toEqual({
      kind: "error",
      message: "nope",
      isRateLimited: true,
    });
    expect(resolveAnnualPerformance(plan, history, beginReady, failed)).toEqual({
      kind: "error",
      message: "nope",
      isRateLimited: true,
    });
  });

  it("measures the year once both boundaries settled", () => {
    const resolution = resolveAnnualPerformance(plan, history, beginReady, endReady);
    expect(resolution.kind).toBe("ready");
    if (resolution.kind !== "ready") return;
    expect(resolution.performance.beginValue).toBe(5000);
    expect(resolution.performance.endValue).toBe(7800);
    expect(resolution.performance.cashContributed).toBe(1200);
    expect(resolution.performance.status).toBe("ok");
  });

  it("still reports the cash of a year whose starting closes are gone for good", () => {
    const resolution = resolveAnnualPerformance(
      plan,
      history,
      { kind: "unavailable", date: "2024-12-31" },
      endReady,
    );
    expect(resolution.kind).toBe("ready");
    if (resolution.kind !== "ready") return;
    expect(resolution.performance.status).toBe("missing-begin-price");
    expect(resolution.performance.beginUnavailable).toBe(true);
    expect(resolution.performance.beginValue).toBeNull();
    expect(resolution.performance.cashContributed).toBe(1200);
  });
});

describe("the idle contract", () => {
  const tx = makeFactory();
  const today = "2026-09-15";

  it("asks for two disabled slots and no valuation plan", () => {
    const specs = idleBoundarySpecs(today);
    expect(specs).toEqual([
      { kind: "no-positions", date: today },
      { kind: "no-positions", date: today },
    ]);
    const [begin, end] = [boundaryQueryOptions(specs[0], "begin"), boundaryQueryOptions(specs[1], "end")];
    expect(begin.enabled).toBe(false);
    expect(end.enabled).toBe(false);
    expect(begin.queryKey).toEqual(["performance", "no-positions", "begin", today]);
    expect(end.queryKey).toEqual(["performance", "no-positions", "end", today]);
  });

  it("never plans a valuation while no year is resolvable or no history exists", () => {
    const idle = { idle: true, specs: idleBoundarySpecs(today) };
    expect(annualPerformanceArgs({ transactions: [], year: null, today })).toEqual(idle);
    expect(annualPerformanceArgs({ transactions: [tx("BUY", "AAPL", 1, 100, "2026-01-05")], year: null, today })).toEqual(idle);
    expect(annualPerformanceArgs({ transactions: [], year: 2026, today })).toEqual(idle);
    expect(vi.mocked(planAnnualValuation)).not.toHaveBeenCalled();
  });

  it("plans both boundaries as soon as there is a year and a history", () => {
    const history = [tx("BUY", "AAPL", 10, 100, "2025-03-02")];
    const request = annualPerformanceArgs({ transactions: history, year: 2025, today });

    expect(request.idle).toBe(false);
    if (request.idle) return;
    expect(request.plan.year).toBe(2025);
    expect(request.plan.kind).toBe("past");
    expect(request.specs).toEqual([request.plan.begin, request.plan.end]);
    expect(vi.mocked(planAnnualValuation)).toHaveBeenCalledTimes(1);
  });
});
