import { useMemo, useState } from "react";
import { findCandidateOversell } from "@/domain/portfolio/position.service";
import { MARKET_TIME_ZONE } from "@/domain/transactions/transaction.constants";
import type { TransactionType } from "@/domain/transactions/transaction.type";
import { ALL_PORTFOLIOS_SCOPE } from "@/features/portfolio/active-portfolio.constants";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { todayIsoInTimeZone } from "@/utils/date.utils";
import { TRANSACTION_ERROR_MESSAGES } from "../transaction-messages.constants";
import type {
  PositionSizeField,
  TransactionFieldErrors,
  TransactionTextField,
  TransactionFormField,
  TransactionFormValues,
  TransactionMutationError,
} from "../transaction-form.type";
import {
  availablePortfolioId,
  buildTransactionInput,
  fieldErrorsFromIssues,
  isNewTransactionViolation,
  oversellMessage,
  positionSizeDisplay,
} from "../transaction-form.utils";
import { useTransactionMutations } from "./use-transaction-mutations.hook";
import { useTransactions } from "./use-transactions.hook";

type UseTransactionFormOptions = {
  portfolios: readonly PortfolioOption[];
  defaultPortfolioId: string;
  onCreated: () => void;
};

function marketToday(): string {
  return todayIsoInTimeZone(MARKET_TIME_ZONE, Date.now());
}

function initialValues(portfolioId: string): TransactionFormValues {
  return { portfolioId, type: "BUY", ticker: "", date: marketToday(), price: "", sizeField: "amount", sizeText: "" };
}

function withoutFields(errors: TransactionFieldErrors, fields: readonly TransactionFormField[]): TransactionFieldErrors {
  if (!fields.some((field) => field in errors)) return errors;
  const next = { ...errors };
  for (const field of fields) delete next[field];
  return next;
}

export function useTransactionForm({ portfolios, defaultPortfolioId, onCreated }: UseTransactionFormOptions) {
  // Every portfolio's history: the oversell pre-check replays only the chosen portfolio and ticker.
  const { transactions } = useTransactions(ALL_PORTFOLIOS_SCOPE);
  const { createTransaction } = useTransactionMutations();

  const [storedValues, setValues] = useState<TransactionFormValues>(() => initialValues(defaultPortfolioId));
  const portfolioId = availablePortfolioId(storedValues.portfolioId, portfolios);
  const values = useMemo(
    () => (portfolioId === storedValues.portfolioId ? storedValues : { ...storedValues, portfolioId }),
    [portfolioId, storedValues],
  );
  const [maxDate] = useState(marketToday);
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sizeDisplay = useMemo(() => positionSizeDisplay(values), [values]);

  function clearErrors(fields: readonly TransactionFormField[]) {
    setFieldErrors((current) => withoutFields(current, fields));
    setFormError(null);
  }

  function setType(type: TransactionType) {
    setValues((current) => ({ ...current, type }));
    clearErrors(["type"]);
  }

  // Ticker is stored as typed (shown uppercase via CSS) so editing mid-string keeps the caret in place.
  function setField(field: TransactionTextField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // A price change also changes the calculated shares or amount.
    clearErrors(field === "price" ? ["price", "quantity", "amount"] : [field]);
  }

  // Editing shares or amount makes that input the driver; the other is recalculated from the price.
  function setSize(field: PositionSizeField, text: string) {
    setValues((current) => ({ ...current, sizeField: field, sizeText: text }));
    clearErrors(["quantity", "amount"]);
  }

  function showMutationError(error: TransactionMutationError) {
    switch (error.kind) {
      case "validation":
        setFieldErrors(fieldErrorsFromIssues(error.issues, values.sizeField));
        return;
      case "oversell":
        setFormError(oversellMessage(error.violation, isNewTransactionViolation(error.violation, transactions)));
        return;
      case "not-found":
        setFormError(TRANSACTION_ERROR_MESSAGES.NOT_FOUND);
        return;
      case "unexpected":
        setFormError(TRANSACTION_ERROR_MESSAGES.UNEXPECTED);
    }
  }

  async function submit() {
    if (isSubmitting) return;
    setFormError(null);

    const built = buildTransactionInput(values, marketToday());
    if (!built.ok) {
      setFieldErrors(built.fieldErrors);
      return;
    }
    setFieldErrors({});

    // Instant feedback when the history is loaded; the server re-checks either way.
    const violation = transactions ? findCandidateOversell(transactions, built.input) : null;
    if (violation) {
      setFormError(oversellMessage(violation, isNewTransactionViolation(violation, transactions)));
      return;
    }

    setIsSubmitting(true);
    const result = await createTransaction(built.input);

    // Stay locked on success: navigation is a transition, and re-enabling first would allow a duplicate create.
    if (result.ok) {
      onCreated();
      return;
    }
    setIsSubmitting(false);
    showMutationError(result.error);
  }

  return { values, sizeDisplay, fieldErrors, formError, isSubmitting, maxDate, setType, setField, setSize, submit };
}
