import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { TransactionType } from "@/domain/transactions/transaction.type";
import { TRANSACTION_TYPE_OPTIONS } from "../transaction-form.constants";
import { TRANSACTION_FORM_MESSAGES } from "../transaction-messages.constants";
import type {
  PositionSizeDisplay,
  PositionSizeField,
  TransactionFieldErrors,
  TransactionFormValues,
  TransactionTextField,
} from "../transaction-form.type";

type TransactionFormProps = {
  values: TransactionFormValues;
  portfolioOptions: readonly SelectOption[];
  sizeDisplay: PositionSizeDisplay;
  fieldErrors: TransactionFieldErrors;
  formError: string | null;
  isSubmitting: boolean;
  maxDate: string;
  cancelHref: string;
  onTypeChange: (type: TransactionType) => void;
  onFieldChange: (field: TransactionTextField, value: string) => void;
  onSizeChange: (field: PositionSizeField, value: string) => void;
  onSubmit: () => void;
};

export function TransactionForm({
  values,
  portfolioOptions,
  sizeDisplay,
  fieldErrors,
  formError,
  isSubmitting,
  maxDate,
  cancelHref,
  onTypeChange,
  onFieldChange,
  onSizeChange,
  onSubmit,
}: TransactionFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  // The calculated input explains itself once it shows a value.
  const amountHint =
    values.sizeField === "quantity" && sizeDisplay.amount ? TRANSACTION_FORM_MESSAGES.AMOUNT_HINT : undefined;
  const sharesHint =
    values.sizeField === "amount" && sizeDisplay.quantity ? TRANSACTION_FORM_MESSAGES.SHARES_HINT : undefined;

  return (
    <Card className="max-w-xl">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
        <SelectField
          id="portfolioId"
          label="Portfolio"
          placeholder="Choose a portfolio"
          value={values.portfolioId}
          options={portfolioOptions}
          error={fieldErrors.portfolioId}
          onChange={(value) => onFieldChange("portfolioId", value)}
        />

        <SegmentedToggle
          name="type"
          legend="Type"
          options={TRANSACTION_TYPE_OPTIONS}
          value={values.type}
          onChange={onTypeChange}
        />

        <TextField
          id="ticker"
          label="Ticker"
          placeholder="e.g. AAPL"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          trailingIcon={Search}
          className="uppercase placeholder:normal-case"
          value={values.ticker}
          error={fieldErrors.ticker}
          onChange={(event) => onFieldChange("ticker", event.target.value)}
        />

        <TextField
          id="date"
          label="Date"
          type="date"
          max={maxDate}
          value={values.date}
          error={fieldErrors.date}
          onChange={(event) => onFieldChange("date", event.target.value)}
        />

        <TextField
          id="price"
          label="Price per share (USD)"
          placeholder="e.g. 200.00"
          inputMode="decimal"
          autoComplete="off"
          value={values.price}
          error={fieldErrors.price}
          onChange={(event) => onFieldChange("price", event.target.value)}
        />

        <TextField
          id="amount"
          label="Amount (USD)"
          placeholder="e.g. 75.00"
          inputMode="decimal"
          autoComplete="off"
          value={sizeDisplay.amount}
          hint={amountHint}
          error={fieldErrors.amount}
          onChange={(event) => onSizeChange("amount", event.target.value)}
        />

        <TextField
          id="quantity"
          label="Shares"
          placeholder="e.g. 0.375"
          inputMode="decimal"
          autoComplete="off"
          value={sizeDisplay.quantity}
          hint={sharesHint}
          error={fieldErrors.quantity}
          onChange={(event) => onSizeChange("quantity", event.target.value)}
        />

        {formError ? (
          <p role="alert" className="rounded-md border border-negative/40 bg-sell-tint px-3 py-2 text-sm text-foreground">
            {formError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <ButtonLink href={cancelHref} variant="secondary">
            Cancel
          </ButtonLink>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add Transaction"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
