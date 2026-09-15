export type SortDirection = "asc" | "desc";

// The sorted column of a table and its direction.
export type SortState<TKey extends string> = { key: TKey; dir: SortDirection };
