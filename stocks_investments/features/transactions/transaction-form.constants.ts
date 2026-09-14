import { ShoppingBag, Tag } from "lucide-react";
import type { SegmentedOption } from "@/components/ui/segmented-toggle";
import type { TransactionType } from "@/domain/transactions/transaction.type";

// Precision of the calculated value shown in the other input; submission uses the exact number.
export const DERIVED_AMOUNT_DECIMALS = 2;
// 9 decimals: a share count copied from this input later closes the position within SHARES_EPSILON (1e-9).
export const DERIVED_SHARES_DECIMALS = 9;

export const TRANSACTION_TYPE_OPTIONS: readonly SegmentedOption<TransactionType>[] = [
  { value: "BUY", label: "Buy", icon: ShoppingBag },
  { value: "SELL", label: "Sell", icon: Tag },
];
