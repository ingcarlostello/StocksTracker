import { Badge } from "@/components/ui/badge";
import type { TransactionType } from "@/domain/transactions/transaction.type";
import { TRANSACTION_TYPE_LABELS } from "../transaction-form.constants";

type TransactionTypeBadgeProps = {
  type: TransactionType;
};

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  return <Badge tone={type === "BUY" ? "positive" : "negative"}>{TRANSACTION_TYPE_LABELS[type]}</Badge>;
}
