import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionInput } from "@/domain/transactions/transaction.type";
import { toTransactionMutationError } from "../transaction-mutation-error.utils";
import type { TransactionMutationResult } from "../transaction-form.type";

export function useTransactionMutations() {
  const create = useMutation(api.transactions.create);

  const createTransaction = useCallback(
    async (input: TransactionInput): Promise<TransactionMutationResult<Id<"transactions">>> => {
      try {
        return { ok: true, value: await create(input) };
      } catch (error) {
        const mutationError = toTransactionMutationError(error);
        // Expected rule violations are shown in the form; anything else also goes to the console for debugging.
        if (mutationError.kind === "unexpected") console.error("[transactions.create]", error);
        return { ok: false, error: mutationError };
      }
    },
    [create],
  );

  return { createTransaction };
}
