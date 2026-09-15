import { useMemo, useState } from "react";
import type { Holding } from "@/domain/portfolio/portfolio.type";
import { toggleSortState } from "@/utils/sort.utils";
import { HOLDING_SORT_DEFAULT_DIRECTION, HOLDINGS_INITIAL_SORT } from "../holdings-table.constants";
import type { HoldingSort, HoldingsTableState } from "../holdings-table.type";
import { holdingsCaption, sortHoldings, toHoldingRows } from "../holdings-table.utils";

// Sort state and formatted rows for any list of holdings; independent of where the holdings come from.
export function useHoldingsTable(holdings: readonly Holding[], scopeLabel: string): HoldingsTableState {
  const [sort, setSort] = useState<HoldingSort>(HOLDINGS_INITIAL_SORT);
  // Sorting never replays transactions or fetches prices.
  const rows = useMemo(() => toHoldingRows(sortHoldings(holdings, sort)), [holdings, sort]);

  return {
    rows,
    sort,
    caption: holdingsCaption(scopeLabel, sort),
    // Functional update: two quick clicks never toggle from a stale sort.
    toggleSort: (key) => setSort((current) => toggleSortState(current, key, HOLDING_SORT_DEFAULT_DIRECTION)),
  };
}
