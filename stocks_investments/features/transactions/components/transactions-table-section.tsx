"use client";

import { Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes.constants";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { useDeleteTransaction } from "../hooks/use-delete-transaction.hook";
import { TRANSACTIONS_RESULTS_ID } from "../transaction-list.constants";
import type { EffectiveSort, TransactionRow, TransactionSortKey } from "../transaction-list.type";
import { TRANSACTION_LIST_MESSAGES } from "../transaction-messages.constants";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { TransactionsTable } from "./transactions-table";

type TransactionsTableSectionProps = {
  rows: readonly TransactionRow[];
  transactions: readonly TransactionLike<Id<"transactions">>[];
  portfolios: readonly PortfolioOption[];
  totalCount: number;
  showPortfolioColumn: boolean;
  sort: EffectiveSort;
  caption: string;
  listQueryString: string;
  onToggleSort: (key: TransactionSortKey) => void;
  onClearFilters: () => void;
};

// Mounted once per portfolio scope (keyed by it), so a scope change closes an open delete dialog.
export function TransactionsTableSection({
  rows,
  transactions,
  portfolios,
  totalCount,
  showPortfolioColumn,
  sort,
  caption,
  listQueryString,
  onToggleSort,
  onClearFilters,
}: TransactionsTableSectionProps) {
  // The card holding the focused button is replaced by the table; the section itself stays and takes focus.
  function clearFilters() {
    document.getElementById(TRANSACTIONS_RESULTS_ID)?.focus();
    onClearFilters();
  }

  const { dialog, statusMessage, requestDelete, cancel, confirm } = useDeleteTransaction({
    transactions,
    portfolios,
    listQueryString,
  });

  return (
    // Focusable so focus has somewhere to go when the deleted row's "⋯" trigger is gone.
    <section id={TRANSACTIONS_RESULTS_ID} tabIndex={-1} aria-label="Transactions" className="focus:outline-none">
      {totalCount === 0 ? (
        <Card className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted">{TRANSACTION_LIST_MESSAGES.EMPTY_SCOPE}</p>
          <ButtonLink href={ROUTES.ADD_TRANSACTION}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
            Add Transaction
          </ButtonLink>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted">{TRANSACTION_LIST_MESSAGES.NO_MATCHES}</p>
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </Card>
      ) : (
        <TransactionsTable
          rows={rows}
          showPortfolioColumn={showPortfolioColumn}
          sort={sort}
          caption={caption}
          onToggleSort={onToggleSort}
          onRequestDelete={requestDelete}
        />
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>
      {dialog ? <DeleteTransactionDialog dialog={dialog} onConfirm={() => void confirm()} onCancel={cancel} /> : null}
    </section>
  );
}
