import { useMemo, useRef, useState } from "react";
import { useMountedRef } from "@/hooks/use-mounted-ref.hook";
import type { Id } from "@/convex/_generated/dataModel";
import { findUpdateOversell } from "@/domain/portfolio/position.service";
import type { TransactionLike } from "@/domain/transactions/transaction.type";
import { isSameTransactionInput } from "@/domain/transactions/transaction.utils";
import type { PortfolioOption, PortfolioScope } from "@/features/portfolio/portfolio-selection.type";
import { EMPTY_TRANSACTION_FORM_VALUES } from "../transaction-form.constants";
import { buildTransactionInput, fieldErrorsFromIssues } from "../transaction-form.utils";
import { editFormValuesFromTransaction, editNotice, movedOutOfScopeHint } from "../transaction-edit.utils";
import { TRANSACTION_ERROR_MESSAGES } from "../transaction-messages.constants";
import { describeOversell } from "../transaction-oversell-message.utils";
import type { OversellContext } from "../transaction-oversell.type";
import { marketToday, useTransactionFormFields } from "./use-transaction-form-fields.hook";
import { useTransactionMutations } from "./use-transaction-mutations.hook";

type StoredTransaction = TransactionLike<Id<"transactions">>;

type UseEditTransactionFormOptions = {
  // Raw route segment: only compared with loaded ids, never sent to Convex.
  transactionId: string;
  history: readonly StoredTransaction[];
  portfolios: readonly PortfolioOption[];
  scope: PortfolioScope;
  onSaved: () => void;
};

type EditPhase = "editing" | "submitting" | "saved";

function findTransaction(history: readonly StoredTransaction[], id: string): StoredTransaction | undefined {
  return history.find((transaction) => transaction.id === id);
}

export function useEditTransactionForm({
  transactionId,
  history,
  portfolios,
  scope,
  onSaved,
}: UseEditTransactionFormOptions) {
  const { updateTransaction } = useTransactionMutations();

  // The version the form was opened with (or last reloaded from); edits elsewhere are detected against it.
  const [baseline, setBaseline] = useState(() => findTransaction(history, transactionId) ?? null);
  const current = useMemo(() => findTransaction(history, transactionId), [history, transactionId]);
  const fields = useTransactionFormFields({
    initialValues: () => {
      const transaction = findTransaction(history, transactionId);
      return transaction ? editFormValuesFromTransaction(transaction) : EMPTY_TRANSACTION_FORM_VALUES;
    },
    portfolios,
  });
  const { values, setFieldErrors, setFormError } = fields;
  const [phase, setPhase] = useState<EditPhase>("editing");
  const [serverDeleted, setServerDeleted] = useState(false);
  const [maxDate] = useState(marketToday);
  // Blocks a second submit before the disabled button has re-rendered, and stays set after a save.
  const lockRef = useRef(false);
  const mountedRef = useMountedRef();

  // Our own save echoes back as a change, so the notice is only evaluated while editing.
  const notice = baseline && phase === "editing" ? editNotice(baseline, current, serverDeleted) : null;
  const canSubmit = phase === "editing" && notice === null;
  const portfolioHint = movedOutOfScopeHint(scope, values.portfolioId, portfolios);

  // Replaces the draft on purpose: keeping unsaved edits over a newer version could silently undo it.
  function reloadLatest() {
    if (!current) return;
    setBaseline(current);
    fields.reset(editFormValuesFromTransaction(current));
  }

  async function submit() {
    if (lockRef.current || !canSubmit || !current) return;
    setFormError(null);

    const built = buildTransactionInput(values, marketToday());
    if (!built.ok) {
      setFieldErrors(built.fieldErrors);
      return;
    }
    setFieldErrors({});

    // Nothing changed: skip the write, so the stored numbers stay bit-identical.
    if (isSameTransactionInput(built.input, current)) {
      lockRef.current = true;
      setPhase("saved");
      onSaved();
      return;
    }

    const context: OversellContext = { action: "update", original: current, edited: built.input, history };
    // Instant feedback; the server re-checks with its own data either way.
    const violation = findUpdateOversell(history, current, built.input);
    if (violation) {
      setFormError(describeOversell(violation, context, portfolios));
      return;
    }

    lockRef.current = true;
    setPhase("submitting");
    const result = await updateTransaction(current.id, built.input);

    // Stay locked on success until the route changes, so the finished form cannot be submitted again.
    if (result.ok) {
      setPhase("saved");
      // A save that settles after the user left the page must not pull them back to the list.
      if (mountedRef.current) onSaved();
      return;
    }
    lockRef.current = false;
    setPhase("editing");

    switch (result.error.kind) {
      case "validation":
        setFieldErrors(fieldErrorsFromIssues(result.error.issues, values.sizeField));
        return;
      case "oversell":
        setFormError(describeOversell(result.error.violation, context, portfolios));
        return;
      case "not-found":
        setServerDeleted(true);
        return;
      case "unexpected":
        setFormError(TRANSACTION_ERROR_MESSAGES.UNEXPECTED);
    }
  }

  if (baseline === null) return { status: "not-found" as const };

  return {
    status: "ready" as const,
    values,
    sizeDisplay: fields.sizeDisplay,
    fieldErrors: fields.fieldErrors,
    formError: fields.formError,
    notice,
    isSubmitting: phase !== "editing",
    canSubmit,
    maxDate,
    portfolioHint,
    setType: fields.setType,
    setField: fields.setField,
    setSize: fields.setSize,
    reloadLatest,
    submit,
  };
}
