import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PortfolioMutationError, PortfolioMutationResult } from "../portfolio-management.type";
import { toPortfolioMutationError } from "../portfolio-mutation-error.utils";

async function runMutation<TValue>(label: string, run: () => Promise<TValue>): Promise<PortfolioMutationResult<TValue>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    const mutationError: PortfolioMutationError = toPortfolioMutationError(error);
    // Expected rule violations are shown on the page; anything else also goes to the console for debugging.
    if (mutationError.kind === "unexpected") console.error(`[portfolios.${label}]`, error);
    return { ok: false, error: mutationError };
  }
}

export function usePortfolioMutations() {
  const create = useMutation(api.portfolios.create);
  const rename = useMutation(api.portfolios.rename);
  const remove = useMutation(api.portfolios.remove);

  const createPortfolio = useCallback((name: string) => runMutation("create", () => create({ name })), [create]);
  const renamePortfolio = useCallback(
    (id: Id<"portfolios">, name: string) => runMutation("rename", () => rename({ id, name })),
    [rename],
  );
  const removePortfolio = useCallback((id: Id<"portfolios">) => runMutation("remove", () => remove({ id })), [remove]);

  return { createPortfolio, renamePortfolio, removePortfolio };
}
