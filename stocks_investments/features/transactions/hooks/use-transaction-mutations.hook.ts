import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionInput } from "@/domain/transactions/transaction.type";
import { toTransactionMutationError } from "../transaction-mutation-error.utils";
import type { TransactionMutationResult } from "../transaction-form.type";

async function runTransactionMutation<TValue>(
  label: string,
  run: () => Promise<TValue>,
): Promise<TransactionMutationResult<TValue>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    const mutationError = toTransactionMutationError(error);
    // Expected rule violations are shown in the UI; anything else also goes to the console for debugging.
    if (mutationError.kind === "unexpected") console.error(`[${label}]`, error);
    return { ok: false, error: mutationError };
  }
}

// Ids come from the Convex portfolio list; the server rejects one that no longer exists.
function toPortfolioId(portfolioId: string): Id<"portfolios"> {
  return portfolioId as Id<"portfolios">;
}

export function useTransactionMutations() {
  const create = useMutation(api.transactions.create);
  const update = useMutation(api.transactions.update);
  const remove = useMutation(api.transactions.remove);

  const createTransaction = useCallback(
    (input: TransactionInput): Promise<TransactionMutationResult<Id<"transactions">>> =>
      runTransactionMutation("transactions.create", () =>
        create({ ...input, portfolioId: toPortfolioId(input.portfolioId) }),
      ),
    [create],
  );

  const updateTransaction = useCallback(
    (id: Id<"transactions">, input: TransactionInput): Promise<TransactionMutationResult<null>> =>
      runTransactionMutation("transactions.update", () =>
        update({ id, ...input, portfolioId: toPortfolioId(input.portfolioId) }),
      ),
    [update],
  );

  const removeTransaction = useCallback(
    (id: Id<"transactions">): Promise<TransactionMutationResult<null>> =>
      runTransactionMutation("transactions.remove", () => remove({ id })),
    [remove],
  );

  return { createTransaction, updateTransaction, removeTransaction };
}
