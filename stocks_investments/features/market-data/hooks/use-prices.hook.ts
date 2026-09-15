import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PRICES_RATE_LIMIT_FALLBACK_SECONDS } from "../prices.constants";
import { PricesApiError } from "../prices.errors";
import { PRICES_ERROR_MESSAGES } from "../prices-messages.constants";
import { currentPricesQueryOptions } from "../prices.service";
import type { PricesState } from "../prices-state.type";

const NO_PRICES = {};
const NO_MISSING: string[] = [];

function messageFor(error: Error | null): string | null {
  if (error === null) return null;
  return error instanceof PricesApiError ? PRICES_ERROR_MESSAGES[error.code] : PRICES_ERROR_MESSAGES.INTERNAL_ERROR;
}

export function usePrices(symbols: readonly string[]): PricesState {
  const query = useQuery(currentPricesQueryOptions(symbols));
  const hasSymbols = symbols.length > 0;

  const rateLimitError =
    query.error instanceof PricesApiError && query.error.code === "RATE_LIMITED" ? query.error : null;
  const rateLimitedAt = rateLimitError ? query.errorUpdatedAt : null;
  const [cooldownEndedFor, setCooldownEndedFor] = useState<number | null>(null);

  useEffect(() => {
    if (rateLimitedAt === null) return;
    const waitSeconds = rateLimitError?.retryAfterSeconds ?? PRICES_RATE_LIMIT_FALLBACK_SECONDS;
    const remainingMs = Math.max(0, rateLimitedAt + waitSeconds * 1000 - Date.now());
    const timer = setTimeout(() => setCooldownEndedFor(rateLimitedAt), remainingMs);
    return () => clearTimeout(timer);
  }, [rateLimitError, rateLimitedAt]);

  const isCoolingDown = rateLimitedAt !== null && cooldownEndedFor !== rateLimitedAt;

  return {
    prices: query.data?.prices ?? NO_PRICES,
    asOfDate: query.data?.asOfDate ?? null,
    missing: query.data?.missing ?? NO_MISSING,
    // A disabled query also reports "pending"; only count it while there is something to price.
    isPending: hasSymbols && query.isPending,
    isFetching: query.isFetching,
    errorMessage: messageFor(query.error),
    // Placeholder data belongs to the previous symbol set; its query has no update time of its own.
    lastUpdatedAt: query.data && !query.isPlaceholderData ? query.dataUpdatedAt : null,
    canRefresh: hasSymbols && !query.isFetching && !isCoolingDown,
    refresh: () => {
      // A second trigger while a refresh is in flight reuses it; cancelling would not stop the HTTP request (no AbortSignal).
      void query.refetch({ cancelRefetch: false });
    },
  };
}
