import { TableCell, TableHeaderCell } from "@/components/ui/table";
import { headerSortDirection } from "@/components/ui/table-sort.utils";
import { TRANSACTION_COLUMN_LABELS } from "../transaction-list.constants";
import type { EffectiveSort, TransactionCellsRow, TransactionSortKey } from "../transaction-list.type";
import { TransactionTypeBadge } from "./transaction-type-badge";

type TransactionColumnSorting = {
  sort: EffectiveSort;
  onToggleSort: (key: TransactionSortKey) => void;
};

type TransactionColumnHeadersProps = {
  showPortfolioColumn: boolean;
  // Omitted → plain headers (no button, no aria-sort).
  sorting?: TransactionColumnSorting;
};

// The shared columns of every transactions table, as header cells (a fragment to place inside a TableRow).
export function TransactionColumnHeaders({ showPortfolioColumn, sorting }: TransactionColumnHeadersProps) {
  function headerSort(key: TransactionSortKey) {
    if (!sorting) return undefined;
    return {
      direction: headerSortDirection(sorting.sort, key),
      onToggle: () => sorting.onToggleSort(key),
    };
  }

  function header(key: TransactionSortKey, align?: "end") {
    return (
      <TableHeaderCell align={align} sort={headerSort(key)}>
        {TRANSACTION_COLUMN_LABELS[key]}
      </TableHeaderCell>
    );
  }

  return (
    <>
      {header("date")}
      {header("type")}
      {header("ticker")}
      {showPortfolioColumn ? header("portfolio") : null}
      {header("shares", "end")}
      {header("price", "end")}
      {header("total", "end")}
    </>
  );
}

type TransactionRowCellsProps = {
  row: TransactionCellsRow;
  showPortfolioColumn: boolean;
};

// The shared body cells of one transaction row (a fragment to place inside a TableRow).
export function TransactionRowCells({ row, showPortfolioColumn }: TransactionRowCellsProps) {
  return (
    <>
      <TableCell>{row.dateLabel}</TableCell>
      <TableCell>
        <TransactionTypeBadge type={row.type} />
      </TableCell>
      <TableCell emphasis>{row.ticker}</TableCell>
      {showPortfolioColumn ? <TableCell muted>{row.portfolioName}</TableCell> : null}
      <TableCell align="end">{row.sharesLabel}</TableCell>
      <TableCell align="end">{row.priceLabel}</TableCell>
      <TableCell align="end">{row.totalLabel}</TableCell>
    </>
  );
}
