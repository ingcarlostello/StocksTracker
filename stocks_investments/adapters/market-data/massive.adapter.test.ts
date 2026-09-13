import { describe, expect, it } from "vitest";
import { MarketDataError } from "./market-data.errors";
import { MassiveMarketDataProvider } from "./massive.adapter";

type Call = { url: string; init: RequestInit | undefined };

function fakeFetch(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(text, { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

function provider(fetchImpl: typeof fetch) {
  return new MassiveMarketDataProvider({ apiKey: "test-key", fetchImpl, baseUrl: "https://example.test" });
}

// Shapes observed from the live API on 2026-09-13.
const tradingDay = {
  queryCount: 4,
  resultsCount: 4,
  adjusted: false,
  status: "OK",
  request_id: "r1",
  results: [
    { T: "AAPL", c: 332.27, o: 330, h: 334, l: 329, v: 1, vw: 1, n: 1, t: 1789156800000 },
    { T: "MSFT", c: 495.63, t: 1789156800000 },
    { T: "BRK.B", c: 510.37, t: 1789156800000 },
    { T: "WFCpL", c: 20.1, t: 1789156800000 },
  ],
};

async function expectMarketDataError(promise: Promise<unknown>, code: string, status: number | null) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(MarketDataError);
  expect(error).toMatchObject({ code, status });
}

describe("MassiveMarketDataProvider.getDailyCloses", () => {
  it("requests the unadjusted grouped daily bars with a bearer token", async () => {
    const calls: Call[] = [];
    await provider(fakeFetch(200, tradingDay, calls)).getDailyCloses("2026-09-11", ["AAPL"]);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://example.test/v2/aggs/grouped/locale/us/market/stocks/2026-09-11?adjusted=false",
    );
    expect(new Headers(calls[0].init?.headers).get("Authorization")).toBe("Bearer test-key");
    expect(calls[0].url).not.toContain("test-key");
  });

  it("returns closes only for the requested symbols", async () => {
    const snapshot = await provider(fakeFetch(200, tradingDay)).getDailyCloses("2026-09-11", [
      "AAPL",
      "BRK.B",
      "ZZZZ",
    ]);
    expect(snapshot).toEqual({
      date: "2026-09-11",
      hasData: true,
      closes: { AAPL: 332.27, "BRK.B": 510.37 },
    });
  });

  it("reports no data on a weekend or holiday (results key absent)", async () => {
    const body = { queryCount: 0, resultsCount: 0, adjusted: false, status: "OK", request_id: "r2" };
    const snapshot = await provider(fakeFetch(200, body)).getDailyCloses("2026-09-07", ["AAPL"]);
    expect(snapshot).toEqual({ date: "2026-09-07", hasData: false, closes: {} });
  });

  it("drops bars whose close is not a positive number", async () => {
    const body = { ...tradingDay, results: [{ T: "AAPL", c: 0 }, { T: "MSFT", c: null }] };
    const snapshot = await provider(fakeFetch(200, body)).getDailyCloses("2026-09-11", ["AAPL", "MSFT"]);
    expect(snapshot.closes).toEqual({});
    expect(snapshot.hasData).toBe(true);
  });

  it.each([
    [429, { status: "ERROR", error: "You've exceeded the maximum requests per minute" }, "RATE_LIMITED"],
    [401, { status: "ERROR", error: "Unknown API Key" }, "UNAUTHORIZED"],
    [403, { status: "NOT_AUTHORIZED", message: "Attempted to request today's data before end of day." }, "NOT_ENTITLED"],
    [400, { status: "ERROR", error: "The path parameter `date` is invalid" }, "BAD_REQUEST"],
    [500, "<html>oops</html>", "UPSTREAM_ERROR"],
  ])("maps HTTP %i to %s", async (status, body, code) => {
    await expectMarketDataError(provider(fakeFetch(status, body)).getDailyCloses("2026-09-11", ["AAPL"]), code, status);
  });

  it("includes the upstream detail in the error message", async () => {
    const error = await provider(fakeFetch(401, { status: "ERROR", error: "Unknown API Key" }))
      .getDailyCloses("2026-09-11", ["AAPL"])
      .catch((e: unknown) => e);
    expect((error as Error).message).toContain("Unknown API Key");
  });

  it("rejects a 200 response that is not a grouped daily payload", async () => {
    await expectMarketDataError(
      provider(fakeFetch(200, { status: "DELAYED" })).getDailyCloses("2026-09-11", ["AAPL"]),
      "INVALID_RESPONSE",
      200,
    );
    await expectMarketDataError(
      provider(fakeFetch(200, "not json")).getDailyCloses("2026-09-11", ["AAPL"]),
      "INVALID_RESPONSE",
      200,
    );
  });

  it("wraps network failures", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expectMarketDataError(provider(failing).getDailyCloses("2026-09-11", ["AAPL"]), "NETWORK_ERROR", null);
  });
});
