import Link from "next/link";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TRANSACTIONS_RESULTS_ID } from "../transaction-list.constants";
import type { DeleteDialogModel, TransactionSummary } from "../transaction-list.type";
import { TRANSACTION_ERROR_MESSAGES, TRANSACTION_LIST_MESSAGES } from "../transaction-messages.constants";
import { TransactionTypeBadge } from "./transaction-type-badge";

type DeleteTransactionDialogProps = {
  dialog: DeleteDialogModel;
  onConfirm: () => void;
  onCancel: () => void;
};

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground">{children}</dd>
    </div>
  );
}

function TransactionSummaryList({ summary }: { summary: TransactionSummary }) {
  return (
    <dl className="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-4 tabular-nums">
      <SummaryItem label="Type">
        <TransactionTypeBadge type={summary.type} />
      </SummaryItem>
      <SummaryItem label="Ticker">
        <span className="font-semibold">{summary.ticker}</span>
      </SummaryItem>
      <SummaryItem label="Shares">{summary.sharesLabel}</SummaryItem>
      <SummaryItem label="Price">{summary.priceLabel}</SummaryItem>
      <SummaryItem label="Total">{summary.totalLabel}</SummaryItem>
      <SummaryItem label="Date">{summary.dateLabel}</SummaryItem>
      <SummaryItem label="Portfolio">{summary.portfolioName}</SummaryItem>
    </dl>
  );
}

// Every state renders the same ConfirmDialog, so moving between them updates the open dialog instead of remounting it.
export function DeleteTransactionDialog({ dialog, onConfirm, onCancel }: DeleteTransactionDialogProps) {
  const shared = {
    confirmLabel: "Delete",
    pendingLabel: "Deleting…",
    returnFocusId: dialog.returnFocusId,
    fallbackFocusId: TRANSACTIONS_RESULTS_ID,
    onConfirm,
    onCancel,
  };

  switch (dialog.kind) {
    case "confirm":
    case "deleting":
      return (
        <ConfirmDialog
          {...shared}
          title={TRANSACTION_LIST_MESSAGES.DELETE_TITLE}
          cancelLabel={dialog.kind === "deleting" ? "Close" : "Cancel"}
          isPending={dialog.kind === "deleting"}
          showConfirm
          error={dialog.kind === "confirm" ? dialog.error : null}
        >
          <TransactionSummaryList summary={dialog.summary} />
          <p>
            {dialog.kind === "deleting"
              ? TRANSACTION_LIST_MESSAGES.DELETE_IN_PROGRESS
              : TRANSACTION_LIST_MESSAGES.IRREVERSIBLE}
          </p>
        </ConfirmDialog>
      );
    case "blocked":
      return (
        <ConfirmDialog
          {...shared}
          title={TRANSACTION_LIST_MESSAGES.BLOCKED_TITLE}
          cancelLabel="Close"
          isPending={false}
          showConfirm={false}
          error={null}
        >
          <TransactionSummaryList summary={dialog.summary} />
          <p className="text-foreground">{dialog.message}</p>
          <Link
            href={dialog.saleEditHref}
            className="self-start rounded-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Edit that sale
          </Link>
        </ConfirmDialog>
      );
    case "missing":
      return (
        <ConfirmDialog
          {...shared}
          title={TRANSACTION_LIST_MESSAGES.DELETE_TITLE}
          cancelLabel="Close"
          isPending={false}
          showConfirm={false}
          error={null}
        >
          <p>{TRANSACTION_ERROR_MESSAGES.NOT_FOUND}</p>
        </ConfirmDialog>
      );
  }
}
