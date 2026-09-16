import { useQuery } from "@tanstack/react-query";
import { pricesErrorMessage } from "../prices-messages.utils";
import { currentPricesQueryOptions } from "../prices.service";
import type { PricesState } from "../prices-state.type";
import { useRateLimitCooldown } from "./use-rate-limit-cooldown.hook";

const NO_PRICES = {};
const NO_MISSING: string[] = [];

export function usePrices(symbols: readonly string[]): PricesState {
  const query = useQuery(currentPricesQueryOptions(symbols));
  const hasSymbols = symbols.length > 0;

  const isCoolingDown = useRateLimitCooldown(query.error, query.errorUpdatedAt);

  return {
    prices: query.data?.prices ?? NO_PRICES,
    asOfDate: query.data?.asOfDate ?? null,
    missing: query.data?.missing ?? NO_MISSING,
    // A disabled query also reports "pending"; only count it while there is something to price.
    isPending: hasSymbols && query.isPending,
    isFetching: query.isFetching,
    errorMessage: query.error === null ? null : pricesErrorMessage(query.error),
    // Placeholder data belongs to the previous symbol set; its query has no update time of its own.
    lastUpdatedAt: query.data && !query.isPlaceholderData ? query.dataUpdatedAt : null,
    canRefresh: hasSymbols && !query.isFetching && !isCoolingDown,
    refresh: () => {
      // A second trigger while a refresh is in flight reuses it; cancelling would not stop the HTTP request (no AbortSignal).
      void query.refetch({ cancelRefetch: false });
    },
  };
}
