import { SORT_DIRECTION_LABELS } from "../constants/sort.constants";
import type { SortDirection, SortState } from "../types/sort.type";

// -1, 0 or 1. Strings compare by UTF-16 code unit ("BRK.B" < "BRKA"); -0 and 0 tie.
export function compareValues(a: number | string, b: number | string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// The same key flips its direction; another key starts in its default direction. Never mutates `current`.
export function toggleSortState<TKey extends string>(
  current: SortState<TKey>,
  key: TKey,
  defaults: Readonly<Record<TKey, SortDirection>>,
): SortState<TKey> {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: defaults[key] };
}

// Direction of `key` when it is the sorted column; null for every other column.
export function sortedDirection<TKey extends string>(sort: SortState<TKey>, key: TKey): SortDirection | null {
  return sort.key === key ? sort.dir : null;
}

// The one caption template of the sortable tables, e.g. "Holdings in all portfolios, sorted by Ticker ascending".
export function sortedTableCaption(subject: string, scopeLabel: string, columnLabel: string, dir: SortDirection): string {
  return `${subject} in ${scopeLabel}, sorted by ${columnLabel} ${SORT_DIRECTION_LABELS[dir]}`;
}
