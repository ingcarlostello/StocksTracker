import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ROUTES } from "@/constants/routes.constants";
import { withQuery } from "@/utils/route.utils";
import {
  clearListFilters,
  dateRangeError,
  hasActiveFilters,
  isoDateOrEmpty,
  normalizeListQuery,
  parseTransactionListQuery,
  reconcileUrlQuery,
  serializeTransactionListQuery,
  toggleSort as toggleListSort,
  toTypeFilter,
} from "../transaction-list-query.utils";
import type {
  EffectiveSort,
  TransactionListQuery,
  TransactionSortKey,
  UrlSyncState,
} from "../transaction-list.type";

// Filters and sort of the transactions list, saved in the URL query. The draft is the in-page source of truth:
// URL writes go through replaceState and commit later, so the URL is only read back to detect navigation.
export function useTransactionListQuery() {
  const searchParams = useSearchParams();
  const urlQuery = useMemo(() => serializeTransactionListQuery(parseTransactionListQuery(searchParams)), [searchParams]);

  const [draft, setDraft] = useState<TransactionListQuery>(() => parseTransactionListQuery(searchParams));
  const [sync, setSync] = useState<UrlSyncState>({ seenUrl: urlQuery, pendingWrites: [] });

  const applied = useMemo(() => normalizeListQuery(draft), [draft]);
  const draftQuery = serializeTransactionListQuery(applied);

  // Conditional and idempotent: once seenUrl catches up, the branch no longer runs.
  if (urlQuery !== sync.seenUrl) {
    const result = reconcileUrlQuery(sync, urlQuery, draftQuery);
    if (result.kind === "own-write") {
      setSync({ seenUrl: urlQuery, pendingWrites: result.pendingWrites });
    } else if (result.kind === "external") {
      // Nav link, Back/Forward or another tab's history entry: the URL wins.
      setSync({ seenUrl: urlQuery, pendingWrites: [] });
      setDraft(parseTransactionListQuery(searchParams));
    }
  }

  // Event handlers only.
  function apply(next: TransactionListQuery) {
    setDraft(next);
    const nextQuery = serializeTransactionListQuery(normalizeListQuery(next));
    if (nextQuery === draftQuery) return;
    setSync((current) => ({ ...current, pendingWrites: [...current.pendingWrites, nextQuery] }));
    window.history.replaceState(null, "", withQuery(ROUTES.TRANSACTIONS, nextQuery));
  }

  return {
    draft,
    applied,
    queryString: draftQuery,
    dateRangeError: dateRangeError(applied),
    hasActiveFilters: hasActiveFilters(applied),
    setTicker: (text: string) => apply({ ...draft, ticker: text }),
    setType: (value: string) => apply({ ...draft, type: toTypeFilter(value) }),
    setFrom: (iso: string) => apply({ ...draft, from: isoDateOrEmpty(iso) }),
    setTo: (iso: string) => apply({ ...draft, to: isoDateOrEmpty(iso) }),
    // Toggles from the sort the rows actually show when given, e.g. date while a hidden portfolio sort is saved.
    toggleSort: (key: TransactionSortKey, shown?: EffectiveSort) =>
      apply(toggleListSort(shown ? { ...draft, sort: shown.key, dir: shown.dir } : draft, key)),
    clearFilters: () => apply(clearListFilters(draft)),
  };
}
