import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { FILTER_TICKER_ID, TICKER_FILTER_MAX_LENGTH, TYPE_FILTER_OPTIONS } from "../transaction-list.constants";
import type { TransactionTypeFilter } from "../transaction-list.type";

type TransactionFiltersProps = {
  // Ticker as typed; shown uppercase via CSS so the caret never jumps.
  ticker: string;
  type: TransactionTypeFilter;
  from: string;
  to: string;
  dateRangeError: string | undefined;
  hasActiveFilters: boolean;
  onTickerChange: (text: string) => void;
  onTypeChange: (value: string) => void;
  onFromChange: (iso: string) => void;
  onToChange: (iso: string) => void;
  onClear: () => void;
};

// Filters apply as the user types; there is nothing to submit.
function preventSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

export function TransactionFilters({
  ticker,
  type,
  from,
  to,
  dateRangeError,
  hasActiveFilters,
  onTickerChange,
  onTypeChange,
  onFromChange,
  onToChange,
  onClear,
}: TransactionFiltersProps) {
  // The button unmounts once nothing is filtered; moving focus first keeps it off <body>.
  function handleClear() {
    document.getElementById(FILTER_TICKER_ID)?.focus();
    onClear();
  }

  return (
    <form
      role="search"
      aria-label="Filter transactions"
      noValidate
      onSubmit={preventSubmit}
      className="flex flex-wrap items-start gap-4"
    >
      <div className="w-full sm:w-44">
        <TextField
          id={FILTER_TICKER_ID}
          label="Ticker"
          placeholder="e.g. AAPL"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={TICKER_FILTER_MAX_LENGTH}
          trailingIcon={Search}
          className="uppercase placeholder:normal-case"
          value={ticker}
          onChange={(event) => onTickerChange(event.target.value)}
        />
      </div>
      <div className="w-full sm:w-40">
        <SelectField id="filter-type" label="Type" value={type} options={TYPE_FILTER_OPTIONS} onChange={onTypeChange} />
      </div>
      <div className="w-full sm:w-44">
        <TextField
          id="filter-from"
          label="From"
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </div>
      <div className="w-full sm:w-44">
        <TextField
          id="filter-to"
          label="To"
          type="date"
          value={to}
          error={dateRangeError}
          onChange={(event) => onToChange(event.target.value)}
        />
      </div>
      {hasActiveFilters ? (
        // Top padding matches a field label, so the button lines up with the inputs even while "To" shows an error.
        <div className="sm:pt-7">
          <Button variant="secondary" onClick={handleClear}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </form>
  );
}
