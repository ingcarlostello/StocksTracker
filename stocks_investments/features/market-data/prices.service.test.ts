import { keepPreviousData } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PricesApiError } from "./prices.errors";
import {
  currentPricesQueryOptions,
  fetchPrices,
  fetchYearEndPrices,
  priceKeys,
  yearEndPricesQueryOptions,
} from "./prices.service";

const okBody = { asOfDate: "2026-09-11", prices: { AAPL: 332.27 }, missing: ["ZZZZ"], fetchedAt: 1 };

function stubFetch(response: Response | Error) {
  const mock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPrices", () => {
  it("requests the prices endpoint with encoded, comma-separated symbols", async () => {
    const mock = stubFetch(json(200, okBody));
    await expect(fetchPrices(["AAPL", "BRK.B"])).resolves.toEqual(okBody);
    expect(mock).toHaveBeenCalledWith("/api/prices?symbols=AAPL,BRK.B", { signal: undefined });
  });

  it("maps an API error body and the Retry-After header", async () => {
    stubFetch(
      json(429, { error: { code: "RATE_LIMITED", message: "slow down" } }, { "Retry-After": "60" }),
    );
    const error = await fetchPrices(["AAPL"]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PricesApiError);
    expect(error).toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfterSeconds: 60, message: "slow down" });
  });

  it("falls back to INTERNAL_ERROR for a non-JSON failure", async () => {
    stubFetch(new Response("<html>502</html>", { status: 502 }));
    await expect(fetchPrices(["AAPL"])).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 502, retryAfterSeconds: null });
  });

  it("ignores an unknown error code in the body", async () => {
    stubFetch(json(500, { error: { code: "SOMETHING_NEW", message: "x" } }));
    await expect(fetchPrices(["AAPL"])).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("rejects a 200 response with an unexpected shape", async () => {
    stubFetch(json(200, { asOfDate: "2026-09-11", prices: { AAPL: "332" }, missing: [], fetchedAt: 1 }));
    await expect(fetchPrices(["AAPL"])).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("wraps network failures", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    await expect(fetchPrices(["AAPL"])).rejects.toMatchObject({ code: "NETWORK_ERROR", status: null });
  });

  it("rethrows aborts untouched so the query can be cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException("Aborted", "AbortError");
    stubFetch(abort);
    await expect(fetchPrices(["AAPL"], controller.signal)).rejects.toBe(abort);
  });
});

describe("currentPricesQueryOptions", () => {
  it("uses one cache key regardless of symbol order or duplicates", () => {
    expect(currentPricesQueryOptions(["MSFT", "AAPL", "MSFT"]).queryKey).toEqual(priceKeys.current(["AAPL", "MSFT"]));
    expect(priceKeys.current(["MSFT", "AAPL"])).toEqual(["prices", "current", ["AAPL", "MSFT"]]);
  });

  it("stays disabled with no symbols and never refetches on focus, reconnect or failure", () => {
    const options = currentPricesQueryOptions([]);
    expect(options).toMatchObject({
      enabled: false,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60_000,
    });
    expect(options).not.toHaveProperty("refetchInterval");
  });

  it("keeps previous closes while a new symbol set loads", () => {
    expect(currentPricesQueryOptions(["AAPL"]).placeholderData).toBe(keepPreviousData);
  });

  it("does not hand the query's AbortSignal to fetch", async () => {
    const mock = stubFetch(json(200, okBody));
    const queryFn = currentPricesQueryOptions(["AAPL"]).queryFn as unknown as (ctx: { signal: AbortSignal }) => Promise<unknown>;
    await queryFn({ signal: new AbortController().signal });
    expect(mock).toHaveBeenCalledWith("/api/prices?symbols=AAPL", { signal: undefined });
  });
});

describe("fetchYearEndPrices", () => {
  it("adds the year to the same prices endpoint", async () => {
    const mock = stubFetch(json(200, { ...okBody, asOfDate: "2025-12-31" }));
    await expect(fetchYearEndPrices(["AAPL", "MSFT"], 2025)).resolves.toMatchObject({ asOfDate: "2025-12-31" });
    expect(mock).toHaveBeenCalledWith("/api/prices?symbols=AAPL,MSFT&year=2025", { signal: undefined });
  });

  it("maps the history-limit 404 to its own code", async () => {
    stubFetch(json(404, { error: { code: "PRICE_HISTORY_UNAVAILABLE", message: "too old" } }));
    const error = await fetchYearEndPrices(["AAPL"], 2021).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PricesApiError);
    expect(error).toMatchObject({ code: "PRICE_HISTORY_UNAVAILABLE", status: 404, message: "too old" });
  });

  it("maps a rejected year to INVALID_YEAR", async () => {
    stubFetch(json(400, { error: { code: "INVALID_YEAR", message: "Year must be four digits" } }));
    await expect(fetchYearEndPrices(["AAPL"], 2026)).rejects.toMatchObject({ code: "INVALID_YEAR", status: 400 });
  });
});

describe("yearEndPricesQueryOptions", () => {
  it("uses one cache key per year regardless of symbol order or duplicates", () => {
    expect(yearEndPricesQueryOptions(2025, ["MSFT", "AAPL", "MSFT"]).queryKey).toEqual([
      "prices",
      "year-end",
      2025,
      ["AAPL", "MSFT"],
    ]);
    expect(yearEndPricesQueryOptions(2025, ["AAPL"]).queryKey).not.toEqual(
      yearEndPricesQueryOptions(2024, ["AAPL"]).queryKey,
    );
  });

  it("never expires a published close, keeps it for a day and never reuses another year's data", () => {
    const options = yearEndPricesQueryOptions(2025, []);
    expect(options).toMatchObject({
      enabled: false,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      gcTime: 86_400_000,
    });
    expect(options).not.toHaveProperty("placeholderData");
  });

  it("does not hand the query's AbortSignal to fetch", async () => {
    const mock = stubFetch(json(200, { ...okBody, asOfDate: "2025-12-31" }));
    const queryFn = yearEndPricesQueryOptions(2025, ["AAPL"]).queryFn as unknown as (ctx: { signal: AbortSignal }) => Promise<unknown>;
    await queryFn({ signal: new AbortController().signal });
    expect(mock).toHaveBeenCalledWith("/api/prices?symbols=AAPL&year=2025", { signal: undefined });
  });
});
