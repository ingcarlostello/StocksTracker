import { useMemo, useState } from "react";
import type { TransactionType } from "@/domain/transactions/transaction.type";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import type {
  PositionSizeField,
  TransactionFieldErrors,
  TransactionFormField,
  TransactionFormValues,
  TransactionTextField,
} from "../transaction-form.type";
import { availablePortfolioId, positionSizeDisplay } from "../transaction-form.utils";

type UseTransactionFormFieldsOptions = {
  // Read once, on mount.
  initialValues: () => TransactionFormValues;
  portfolios: readonly PortfolioOption[];
};

function withoutFields(errors: TransactionFieldErrors, fields: readonly TransactionFormField[]): TransactionFieldErrors {
  if (!fields.some((field) => field in errors)) return errors;
  const next = { ...errors };
  for (const field of fields) delete next[field];
  return next;
}

// Field state shared by the create and edit forms; each form keeps its own submit flow.
export function useTransactionFormFields({ initialValues, portfolios }: UseTransactionFormFieldsOptions) {
  const [storedValues, setValues] = useState<TransactionFormValues>(initialValues);
  const portfolioId = availablePortfolioId(storedValues.portfolioId, portfolios);
  const values = useMemo(
    () => (portfolioId === storedValues.portfolioId ? storedValues : { ...storedValues, portfolioId }),
    [portfolioId, storedValues],
  );
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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

  function reset(nextValues: TransactionFormValues) {
    setValues(nextValues);
    setFieldErrors({});
    setFormError(null);
  }

  return {
    values,
    sizeDisplay,
    fieldErrors,
    formError,
    setType,
    setField,
    setSize,
    setFieldErrors,
    setFormError,
    reset,
  };
}
