"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { portfolioSelectOptions } from "@/features/portfolio/portfolio-options.utils";
import type { PortfolioOption, PortfolioScope } from "@/features/portfolio/portfolio-selection.type";
import { useIsClient } from "@/hooks/use-is-client.hook";
import { useEditTransactionData } from "../hooks/use-edit-transaction-data.hook";
import { useEditTransactionForm } from "../hooks/use-edit-transaction-form.hook";
import { TRANSACTION_FORM_FIRST_FIELD_ID, TRANSACTION_SUBMIT_LABELS } from "../transaction-form.constants";
import { TRANSACTION_EDIT_MESSAGES } from "../transaction-messages.constants";
import { TransactionEditNotice, TransactionNotFoundNotice } from "./transaction-edit-notice";
import { TransactionForm } from "./transaction-form";

type EditTransactionViewProps = {
  transactionId: string;
  // Already sanitized on the server: the filtered list the user came from.
  returnHref: string;
};

type EditTransactionFormProps = EditTransactionViewProps & {
  history: TransactionLike<Id<"transactions">>[];
  portfolios: PortfolioOption[];
  scope: PortfolioScope;
};

function EditTransactionForm({ transactionId, returnHref, history, portfolios, scope }: EditTransactionFormProps) {
  const router = useRouter();
  const form = useEditTransactionForm({
    transactionId,
    history,
    portfolios,
    scope,
    // replace: Back after saving returns to the list, not to the finished form.
    onSaved: () => router.replace(returnHref),
  });
  const portfolioOptions = useMemo(() => portfolioSelectOptions(portfolios), [portfolios]);

  // The banner holding the focused button disappears on reload, so focus moves to the refreshed form.
  function reloadLatest() {
    if (form.status === "ready") form.reloadLatest();
    document.getElementById(TRANSACTION_FORM_FIRST_FIELD_ID)?.focus();
  }

  if (form.status === "not-found") return <TransactionNotFoundNotice backHref={returnHref} />;

  return (
    <TransactionForm
      values={form.values}
      portfolioOptions={portfolioOptions}
      sizeDisplay={form.sizeDisplay}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      isSubmitting={form.isSubmitting}
      maxDate={form.maxDate}
      cancelHref={returnHref}
      submitLabel={TRANSACTION_SUBMIT_LABELS.edit.idle}
      submittingLabel={TRANSACTION_SUBMIT_LABELS.edit.pending}
      submitDisabled={!form.canSubmit}
      portfolioHint={form.portfolioHint}
      notice={
        form.notice ? (
          <TransactionEditNotice kind={form.notice} onReload={reloadLatest} backHref={returnHref} />
        ) : null
      }
      onTypeChange={form.setType}
      onFieldChange={form.setField}
      onSizeChange={form.setSize}
      onSubmit={() => void form.submit()}
    />
  );
}

// The max date comes from the viewer's clock, so the form is rendered only in the browser once the data is loaded.
export function EditTransactionView({ transactionId, returnHref }: EditTransactionViewProps) {
  const isClient = useIsClient();
  const data = useEditTransactionData();

  if (!isClient || data.status === "loading") {
    return (
      <Card className="max-w-xl">
        <p role="status" className="text-sm text-muted">
          {TRANSACTION_EDIT_MESSAGES.LOADING}
        </p>
      </Card>
    );
  }
  // Keyed so opening another transaction starts from a fresh baseline.
  return (
    <EditTransactionForm
      key={transactionId}
      transactionId={transactionId}
      returnHref={returnHref}
      history={data.history}
      portfolios={data.portfolios}
      scope={data.scope}
    />
  );
}
