import { ShoppingBag, Tag } from "lucide-react";
import type { SegmentedOption } from "@/components/ui/segmented-toggle";
import type { TransactionType } from "@/domain/transactions/transaction.type";
import type { TransactionFormValues } from "./transaction-form.type";

// Precision of the calculated value shown in the other input; submission uses the exact number.
export const DERIVED_AMOUNT_DECIMALS = 2;
// 9 decimals: a share count copied from this input later closes the position within SHARES_EPSILON (1e-9).
export const DERIVED_SHARES_DECIMALS = 9;

// Share counts typed by hand rarely exceed broker precision; longer ones almost always come from an amount.
export const EDIT_SHARES_DRIVER_MAX_DECIMALS = 6;

// A stored price reopens as "333.00", like a price typed as money.
export const PRICE_TEXT_MIN_DECIMALS = 2;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: "Buy",
  SELL: "Sell",
};

export const TRANSACTION_TYPE_OPTIONS: readonly SegmentedOption<TransactionType>[] = [
  { value: "BUY", label: TRANSACTION_TYPE_LABELS.BUY, icon: ShoppingBag },
  { value: "SELL", label: TRANSACTION_TYPE_LABELS.SELL, icon: Tag },
];

export const EMPTY_TRANSACTION_FORM_VALUES: TransactionFormValues = {
  portfolioId: "",
  type: "BUY",
  ticker: "",
  date: "",
  price: "",
  sizeField: "quantity",
  sizeText: "",
};

// First field of the form; focus goes back to it when a notice holding the focused button disappears.
export const TRANSACTION_FORM_FIRST_FIELD_ID = "portfolioId";

export const TRANSACTION_SUBMIT_LABELS = {
  create: { idle: "Add Transaction", pending: "Adding…" },
  edit: { idle: "Save Changes", pending: "Saving…" },
} as const;
