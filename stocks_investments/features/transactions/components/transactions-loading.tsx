import { Card } from "@/components/ui/card";
import { TRANSACTION_LIST_MESSAGES } from "../transaction-messages.constants";

// Suspense fallback of the list and its loading state while the scope's transactions arrive.
export function TransactionsLoading() {
  return (
    <Card>
      <p role="status" className="text-sm text-muted">
        {TRANSACTION_LIST_MESSAGES.LOADING}
      </p>
    </Card>
  );
}
