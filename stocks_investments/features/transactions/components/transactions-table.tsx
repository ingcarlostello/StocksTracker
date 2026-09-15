import { Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { headerSortDirection } from "@/components/ui/table-sort.utils";
import { ROW_ACTIONS_PANEL_ESTIMATED_HEIGHT, TRANSACTION_COLUMN_LABELS } from "../transaction-list.constants";
import type { EffectiveSort, TransactionRow, TransactionSortKey } from "../transaction-list.type";
import { TransactionTypeBadge } from "./transaction-type-badge";

type TransactionsTableProps = {
  rows: readonly TransactionRow[];
  showPortfolioColumn: boolean;
  sort: EffectiveSort;
  caption: string;
  onToggleSort: (key: TransactionSortKey) => void;
  onRequestDelete: (id: string, triggerId: string) => void;
};

export function TransactionsTable({
  rows,
  showPortfolioColumn,
  sort,
  caption,
  onToggleSort,
  onRequestDelete,
}: TransactionsTableProps) {
  function headerSort(key: TransactionSortKey) {
    return {
      direction: headerSortDirection(sort, key),
      onToggle: () => onToggleSort(key),
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
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          {header("date")}
          {header("type")}
          {header("ticker")}
          {showPortfolioColumn ? header("portfolio") : null}
          {header("shares", "end")}
          {header("price", "end")}
          {header("total", "end")}
          <TableHeaderCell align="end" srOnly>
            Actions
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.dateLabel}</TableCell>
            <TableCell>
              <TransactionTypeBadge type={row.type} />
            </TableCell>
            <TableCell emphasis>{row.ticker}</TableCell>
            {showPortfolioColumn ? <TableCell muted>{row.portfolioName}</TableCell> : null}
            <TableCell align="end">{row.sharesLabel}</TableCell>
            <TableCell align="end">{row.priceLabel}</TableCell>
            <TableCell align="end">{row.totalLabel}</TableCell>
            <TableCell align="end">
              {/* Negative margin keeps the 32px trigger from making action rows taller than the text rows. */}
              <div className="-my-1.5 flex justify-end">
                <RowActionsMenu
                  id={row.actionsId}
                  label={`Actions for ${row.description}`}
                  estimatedPanelHeight={ROW_ACTIONS_PANEL_ESTIMATED_HEIGHT}
                  items={[
                    { kind: "link", label: "Edit", ariaLabel: `Edit ${row.description}`, href: row.editHref, icon: Pencil },
                    {
                      kind: "button",
                      label: "Delete",
                      ariaLabel: `Delete ${row.description}`,
                      icon: Trash2,
                      tone: "danger",
                      onSelect: (triggerId) => onRequestDelete(row.id, triggerId),
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
