import type { NextRequest } from "next/server";
import { MarketDataError } from "@/adapters/market-data/market-data.errors";
import { MissingEnvError } from "@/lib/env.server";
import { PricesRequestError } from "@/services/market-data/market-data.errors";
import { getMarketDataService } from "@/services/market-data/market-data.server";
import type { ApiErrorCode, ApiErrorResponse } from "@/types/api-error.type";

const NO_STORE = { "Cache-Control": "no-store" };
const RATE_LIMIT_RETRY_SECONDS = "60";

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  headers: Record<string, string> = {},
): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof PricesRequestError) {
    if (error.code === "INVALID_SYMBOLS") {
      const detail = error.invalidSymbols.length > 0 ? `: ${error.invalidSymbols.join(", ")}` : "";
      return errorResponse(400, "INVALID_SYMBOLS", `${error.message}${detail}`);
    }
    return errorResponse(503, "PRICES_UNAVAILABLE", error.message);
  }
  if (error instanceof MarketDataError && error.code === "RATE_LIMITED") {
    return errorResponse(429, "RATE_LIMITED", "Market data rate limit reached. Try again in a minute.", {
      "Retry-After": RATE_LIMIT_RETRY_SECONDS,
    });
  }

  // Details can mention upstream responses or configuration; keep them in server logs only.
  console.error("[api/prices]", error);
  if (error instanceof MissingEnvError || (error instanceof MarketDataError && error.code === "UNAUTHORIZED")) {
    return errorResponse(500, "CONFIGURATION_ERROR", "Market data is not configured on the server.");
  }
  if (error instanceof MarketDataError) {
    return errorResponse(502, "UPSTREAM_ERROR", "The market data provider could not be reached.");
  }
  return errorResponse(500, "INTERNAL_ERROR", "Unexpected error while loading prices.");
}

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .filter((symbol) => symbol.trim().length > 0);
  try {
    const prices = await getMarketDataService().getCurrentPrices(symbols);
    return Response.json(prices, { headers: NO_STORE });
  } catch (error) {
    return toErrorResponse(error);
  }
}
