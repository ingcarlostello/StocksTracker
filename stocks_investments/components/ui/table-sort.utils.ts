import type { SortDirection, SortState } from "@/types/sort.type";
import { sortedDirection } from "@/utils/sort.utils";
import type { TableSortDirection } from "./table";

const ARIA_SORT_DIRECTIONS: Readonly<Record<SortDirection, TableSortDirection>> = {
  asc: "ascending",
  desc: "descending",
};

// aria-sort token for the sorted column; null for every other column. The column decision is the tested
// sortedDirection; this file only maps tokens.
export function headerSortDirection<TKey extends string>(sort: SortState<TKey>, key: TKey): TableSortDirection | null {
  const dir = sortedDirection(sort, key);
  return dir === null ? null : ARIA_SORT_DIRECTIONS[dir];
}
