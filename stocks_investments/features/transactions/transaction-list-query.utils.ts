import { ROUTES } from "@/constants/routes.constants";
import { normalizeTicker } from "@/domain/transactions/transaction-validation.service";
import type { SortDirection } from "@/types/sort.type";
import { isIsoDate } from "@/utils/date.utils";
import { withQuery } from "@/utils/route.utils";
import { toggleSortState } from "@/utils/sort.utils";
import {
  DEFAULT_LIST_QUERY,
  LIST_QUERY_KEY_ORDER,
  LIST_QUERY_PARAMS,
  SORT_DEFAULT_DIRECTION,
  TICKER_FILTER_MAX_LENGTH,
  TRANSACTION_SORT_KEYS,
} from "./transaction-list.constants";
import type {
  EffectiveSort,
  TransactionListQuery,
  TransactionSortKey,
  TransactionTypeFilter,
  UrlSyncResult,
  UrlSyncState,
} from "./transaction-list.type";
import { TRANSACTION_LIST_MESSAGES } from "./transaction-messages.constants";

function normalizeTickerFilter(text: string): string {
  return normalizeTicker(text).slice(0, TICKER_FILTER_MAX_LENGTH);
}

// Unknown values mean no type filter; shared by the URL parser and the Type select.
export function toTypeFilter(value: string | null): TransactionTypeFilter {
  return value === "buy" || value === "sell" ? value : "all";
}

function isSortKey(value: string | null): value is TransactionSortKey {
  return (TRANSACTION_SORT_KEYS as readonly (string | null)[]).includes(value);
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "asc" || value === "desc";
}

// Shared by the URL parser and the date inputs: anything but a complete ISO date is no bound.
export function isoDateOrEmpty(value: string | null): string {
  return value !== null && isIsoDate(value) ? value : "";
}

// Invalid or unknown values are ignored, so a hand-edited URL never breaks the list.
export function parseTransactionListQuery(params: Pick<URLSearchParams, "get">): TransactionListQuery {
  const type = params.get(LIST_QUERY_PARAMS.type);
  const sortParam = params.get(LIST_QUERY_PARAMS.sort);
  const dir = params.get(LIST_QUERY_PARAMS.dir);
  const sort = isSortKey(sortParam) ? sortParam : DEFAULT_LIST_QUERY.sort;
  return {
    ticker: normalizeTickerFilter(params.get(LIST_QUERY_PARAMS.ticker) ?? ""),
    type: toTypeFilter(type),
    from: isoDateOrEmpty(params.get(LIST_QUERY_PARAMS.from)),
    to: isoDateOrEmpty(params.get(LIST_QUERY_PARAMS.to)),
    sort,
    dir: isSortDirection(dir) ? dir : SORT_DEFAULT_DIRECTION[sort],
  };
}

// The draft keeps the ticker as typed; filtering and the URL use the normalized one.
export function normalizeListQuery(draft: TransactionListQuery): TransactionListQuery {
  return { ...draft, ticker: normalizeTickerFilter(draft.ticker) };
}

function isDefaultParam(query: TransactionListQuery, key: keyof TransactionListQuery): boolean {
  if (key === "dir") return query.dir === SORT_DEFAULT_DIRECTION[query.sort];
  return query[key] === DEFAULT_LIST_QUERY[key];
}

// Defaults are omitted, so the unfiltered, date-sorted list is plain "/transactions".
export function serializeTransactionListQuery(query: TransactionListQuery): string {
  const normalized = normalizeListQuery(query);
  const params = new URLSearchParams();
  for (const key of LIST_QUERY_KEY_ORDER) {
    if (!isDefaultParam(normalized, key)) params.set(LIST_QUERY_PARAMS[key], normalized[key]);
  }
  return params.toString();
}

export function transactionsListHref(query: TransactionListQuery): string {
  return withQuery(ROUTES.TRANSACTIONS, serializeTransactionListQuery(query));
}

export function editTransactionHref(id: string, queryString: string): string {
  return withQuery(`${ROUTES.TRANSACTIONS}/${encodeURIComponent(id)}/edit`, queryString);
}

// List filtered to one ticker. The filter is a prefix match, so "F" also lists "FB" (accepted).
export function tickerTransactionsHref(ticker: string): string {
  return transactionsListHref({ ...DEFAULT_LIST_QUERY, ticker });
}

export function toggleSort(query: TransactionListQuery, key: TransactionSortKey): TransactionListQuery {
  const next = toggleSortState({ key: query.sort, dir: query.dir }, key, SORT_DEFAULT_DIRECTION);
  return { ...query, sort: next.key, dir: next.dir };
}

// A portfolio sort stays saved while its column is hidden, but the rows fall back to newest first.
export function effectiveSort(query: TransactionListQuery, showPortfolioColumn: boolean): EffectiveSort {
  if (query.sort === "portfolio" && !showPortfolioColumn) return { key: "date", dir: "desc" };
  return { key: query.sort, dir: query.dir };
}

export function dateRangeError(query: TransactionListQuery): string | undefined {
  return query.from && query.to && query.from > query.to ? TRANSACTION_LIST_MESSAGES.DATE_RANGE_INVALID : undefined;
}

// Sort is not a filter, so it does not count.
export function hasActiveFilters(query: TransactionListQuery): boolean {
  return (
    query.ticker !== DEFAULT_LIST_QUERY.ticker ||
    query.type !== DEFAULT_LIST_QUERY.type ||
    query.from !== DEFAULT_LIST_QUERY.from ||
    query.to !== DEFAULT_LIST_QUERY.to
  );
}

export function clearListFilters(query: TransactionListQuery): TransactionListQuery {
  return { ...DEFAULT_LIST_QUERY, sort: query.sort, dir: query.dir };
}

// Tells a URL change caused by the list's own (possibly delayed) replaceState calls apart from navigation.
// Observed URLs are a subsequence of the writes, so the last match drops every older pending write.
export function reconcileUrlQuery(state: UrlSyncState, urlQuery: string, draftQuery: string): UrlSyncResult {
  if (urlQuery === state.seenUrl) return { kind: "unchanged" };
  const index = state.pendingWrites.lastIndexOf(urlQuery);
  if (index >= 0) return { kind: "own-write", pendingWrites: state.pendingWrites.slice(index + 1) };
  // The URL caught up with the latest intent.
  if (urlQuery === draftQuery) return { kind: "own-write", pendingWrites: [] };
  return { kind: "external" };
}
