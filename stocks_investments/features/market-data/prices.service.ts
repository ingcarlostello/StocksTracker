import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { API_ENDPOINTS, API_ERROR_CODES } from "@/constants/api.constants";
import type { ApiErrorResponse } from "@/types/api-error.type";
import type { PricesResponse } from "@/types/prices-response.type";
import { isRecord } from "@/utils/type-guard.utils";
import { PRICES_STALE_TIME_MS } from "./prices.constants";
import { PricesApiError } from "./prices.errors";

function isPricesResponse(body: unknown): body is PricesResponse {
  if (!isRecord(body)) return false;
  const { asOfDate, prices, missing, fetchedAt } = body;
  return (
    typeof asOfDate === "string" &&
    isRecord(prices) &&
    Object.values(prices).every((price) => typeof price === "number" && Number.isFinite(price)) &&
    Array.isArray(missing) &&
    missing.every((symbol) => typeof symbol === "string") &&
    typeof fetchedAt === "number"
  );
}

function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
  if (!isRecord(body) || !isRecord(body.error)) return false;
  const { code, message } = body.error;
  return (API_ERROR_CODES as readonly unknown[]).includes(code) && typeof message === "string";
}

function parseRetryAfterSeconds(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

// Body parsing can fail on non-JSON error pages; the HTTP status still decides the outcome.
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchPrices(symbols: readonly string[], signal?: AbortSignal): Promise<PricesResponse> {
  const url = `${API_ENDPOINTS.PRICES}?symbols=${symbols.map(encodeURIComponent).join(",")}`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PricesApiError("NETWORK_ERROR", "Could not reach the prices endpoint");
  }

  const body = await readJson(response);

  if (!response.ok) {
    const apiError = isApiErrorResponse(body) ? body.error : null;
    throw new PricesApiError(
      apiError?.code ?? "INTERNAL_ERROR",
      apiError?.message ?? `Prices request failed with status ${response.status}`,
      response.status,
      parseRetryAfterSeconds(response.headers.get("Retry-After")),
    );
  }

  if (!isPricesResponse(body)) {
    throw new PricesApiError("INVALID_RESPONSE", "Prices response has an unexpected shape", response.status);
  }
  return body;
}

function normalizeKeySymbols(symbols: readonly string[]): string[] {
  return [...new Set(symbols)].sort();
}

export const priceKeys = {
  all: ["prices"] as const,
  current: (symbols: readonly string[]) => [...priceKeys.all, "current", normalizeKeySymbols(symbols)] as const,
};

// Single cache contract for current prices: every caller shares this key and these options.
export function currentPricesQueryOptions(symbols: readonly string[]) {
  const keySymbols = normalizeKeySymbols(symbols);
  return queryOptions({
    queryKey: priceKeys.current(keySymbols),
    // No AbortSignal: the server finishes the upstream call anyway, so cancelling on unmount would only
    // make a quick remount start a second request instead of reusing the one in flight.
    queryFn: () => fetchPrices(keySymbols),
    enabled: keySymbols.length > 0,
    // When the held tickers change, keep showing known closes while the new set loads.
    placeholderData: keepPreviousData,
    staleTime: PRICES_STALE_TIME_MS,
    // Retries would spend the provider's 5 requests/minute on failures.
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
  });
}
