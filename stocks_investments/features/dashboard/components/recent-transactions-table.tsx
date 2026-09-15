import { Table, TableBody, TableHead, TableRow } from "@/components/ui/table";
import { TransactionColumnHeaders, TransactionRowCells } from "@/features/transactions/components/transaction-columns";
import type { RecentTransactionRow } from "../dashboard.type";

type RecentTransactionsTableProps = {
  rows: readonly RecentTransactionRow[];
  showPortfolioColumn: boolean;
  caption: string;
};

// Read-only: plain headers (no sorting, no aria-sort) and no "⋯" column.
export function RecentTransactionsTable({ rows, showPortfolioColumn, caption }: RecentTransactionsTableProps) {
  return (
    <Table caption={caption}>
      <TableHead>
        <TableRow>
          <TransactionColumnHeaders showPortfolioColumn={showPortfolioColumn} />
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TransactionRowCells row={row} showPortfolioColumn={showPortfolioColumn} />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
