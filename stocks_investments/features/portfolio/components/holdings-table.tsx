import { List } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { SignedValue } from "@/components/ui/signed-value";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { headerSortDirection } from "@/components/ui/table-sort.utils";
import { HOLDING_ACTION_LABELS, HOLDING_COLUMN_LABELS, HOLDING_COLUMNS } from "../holdings-table.constants";
import type { HoldingRow, HoldingSort, HoldingSortKey } from "../holdings-table.type";

type HoldingsTableProps = {
  rows: readonly HoldingRow[];
  sort: HoldingSort;
  caption: string;
  onToggleSort: (key: HoldingSortKey) => void;
};

export function HoldingsTable({ rows, sort, caption, onToggleSort }: HoldingsTableProps) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          {HOLDING_COLUMNS.map((column) => (
            <TableHeaderCell
              key={column.key}
              align={column.align}
              sort={{ direction: headerSortDirection(sort, column.key), onToggle: () => onToggleSort(column.key) }}
            >
              {column.visibleLabel ? (
                <>
                  {/* Short visible header ("%"); the button is named by the full label ("Return %"). */}
                  <span aria-hidden="true">{column.visibleLabel}</span>
                  <span className="sr-only">{HOLDING_COLUMN_LABELS[column.key]}</span>
                </>
              ) : (
                HOLDING_COLUMN_LABELS[column.key]
              )}
            </TableHeaderCell>
          ))}
          <TableHeaderCell align="end" srOnly>
            {HOLDING_ACTION_LABELS.HEADER}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ticker}>
            <TableCell emphasis>{row.ticker}</TableCell>
            <TableCell align="end">{row.sharesLabel}</TableCell>
            <TableCell align="end">{row.averageCostLabel}</TableCell>
            <TableCell align="end" muted={!row.hasPrice}>
              {row.currentPriceLabel}
            </TableCell>
            <TableCell align="end" muted={!row.hasPrice}>
              {row.marketValueLabel}
            </TableCell>
            <TableCell align="end">
              <SignedValue sign={row.gainLoss.sign}>{row.gainLoss.label}</SignedValue>
            </TableCell>
            <TableCell align="end">
              <SignedValue sign={row.returnPercentage.sign}>{row.returnPercentage.label}</SignedValue>
            </TableCell>
            <TableCell align="end">
              {/* Negative margin keeps the 32px trigger from making action rows taller than the text rows. */}
              <div className="-my-1.5 flex justify-end">
                <RowActionsMenu
                  id={row.actionsId}
                  label={row.actionsLabel}
                  items={[
                    {
                      kind: "link",
                      label: HOLDING_ACTION_LABELS.VIEW_TRANSACTIONS,
                      ariaLabel: row.viewTransactionsLabel,
                      href: row.viewTransactionsHref,
                      icon: List,
                    },
                  ]}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
