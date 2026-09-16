import { useRef, useState } from "react";
import { useMountedRef } from "@/hooks/use-mounted-ref.hook";
import { marketToday } from "@/domain/market-data/trading-date.service";
import { findCandidateOversell } from "@/domain/portfolio/position.service";
import { ALL_PORTFOLIOS_SCOPE } from "@/features/portfolio/active-portfolio.constants";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { TRANSACTION_ERROR_MESSAGES } from "../transaction-messages.constants";
import type { TransactionFormValues, TransactionMutationError } from "../transaction-form.type";
import { buildTransactionInput, fieldErrorsFromIssues } from "../transaction-form.utils";
import { describeOversell } from "../transaction-oversell-message.utils";
import type { OversellContext } from "../transaction-oversell.type";
import { useTransactionFormFields } from "./use-transaction-form-fields.hook";
import { useTransactionMutations } from "./use-transaction-mutations.hook";
import { useTransactions } from "./use-transactions.hook";

type UseTransactionFormOptions = {
  portfolios: readonly PortfolioOption[];
  defaultPortfolioId: string;
  onCreated: () => void;
};

function initialValues(portfolioId: string): TransactionFormValues {
  return { portfolioId, type: "BUY", ticker: "", date: marketToday(), price: "", sizeField: "amount", sizeText: "" };
}

export function useTransactionForm({ portfolios, defaultPortfolioId, onCreated }: UseTransactionFormOptions) {
  // Every portfolio's history: the oversell pre-check replays only the chosen portfolio and ticker.
  const { transactions } = useTransactions(ALL_PORTFOLIOS_SCOPE);
  const { createTransaction } = useTransactionMutations();

  const fields = useTransactionFormFields({ initialValues: () => initialValues(defaultPortfolioId), portfolios });
  const { values, setFieldErrors, setFormError } = fields;
  const [maxDate] = useState(marketToday);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Blocks a second submit before the disabled button has re-rendered.
  const lockRef = useRef(false);
  const mountedRef = useMountedRef();

  function showMutationError(error: TransactionMutationError, context: OversellContext) {
    switch (error.kind) {
      case "validation":
        setFieldErrors(fieldErrorsFromIssues(error.issues, values.sizeField));
        return;
      case "oversell":
        setFormError(describeOversell(error.violation, context, portfolios));
        return;
      case "not-found":
        setFormError(TRANSACTION_ERROR_MESSAGES.NOT_FOUND);
        return;
      case "unexpected":
        setFormError(TRANSACTION_ERROR_MESSAGES.UNEXPECTED);
    }
  }

  async function submit() {
    if (lockRef.current) return;
    setFormError(null);

    const built = buildTransactionInput(values, marketToday());
    if (!built.ok) {
      setFieldErrors(built.fieldErrors);
      return;
    }
    setFieldErrors({});

    const context: OversellContext = { action: "create", candidate: built.input, history: transactions };
    // Instant feedback when the history is loaded; the server re-checks either way.
    const violation = transactions ? findCandidateOversell(transactions, built.input) : null;
    if (violation) {
      setFormError(describeOversell(violation, context, portfolios));
      return;
    }

    lockRef.current = true;
    setIsSubmitting(true);
    const result = await createTransaction(built.input);

    // Stay locked on success: navigation is a transition, and re-enabling first would allow a duplicate create.
    if (result.ok) {
      // A create that settles after the user left the page must not pull them back to the list.
      if (mountedRef.current) onCreated();
      return;
    }
    lockRef.current = false;
    setIsSubmitting(false);
    showMutationError(result.error, context);
  }

  return {
    values,
    sizeDisplay: fields.sizeDisplay,
    fieldErrors: fields.fieldErrors,
    formError: fields.formError,
    isSubmitting,
    maxDate,
    setType: fields.setType,
    setField: fields.setField,
    setSize: fields.setSize,
    submit,
  };
}
