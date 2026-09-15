import { Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ROW_ACTIONS_PANEL_ESTIMATED_HEIGHT } from "../transaction-list.constants";
import type { EffectiveSort, TransactionRow, TransactionSortKey } from "../transaction-list.type";
import { TransactionColumnHeaders, TransactionRowCells } from "./transaction-columns";

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
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TransactionColumnHeaders showPortfolioColumn={showPortfolioColumn} sorting={{ sort, onToggleSort }} />
          <TableHeaderCell align="end" srOnly>
            Actions
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TransactionRowCells row={row} showPortfolioColumn={showPortfolioColumn} />
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
