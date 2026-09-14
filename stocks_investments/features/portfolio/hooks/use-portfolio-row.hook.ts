import { useState } from "react";
import { normalizePortfolioName } from "@/domain/portfolio/portfolio-name.service";
import type { PortfolioRowMode } from "../portfolio-management.type";
import { portfolioErrorMessage } from "../portfolio-mutation-error.utils";
import { blockedDeleteMessage, portfolioNameError } from "../portfolio-management.utils";
import type { PortfolioOption } from "../portfolio-selection.type";
import { usePortfolioMutations } from "./use-portfolio-mutations.hook";

type UsePortfolioRowOptions = {
  portfolio: PortfolioOption;
  portfolios: readonly PortfolioOption[];
  transactionCount: number;
};

// Rename and delete flow of one row on the manage page.
export function usePortfolioRow({ portfolio, portfolios, transactionCount }: UsePortfolioRowOptions) {
  const { renamePortfolio, removePortfolio } = usePortfolioMutations();
  const [mode, setMode] = useState<PortfolioRowMode>("view");
  const [draftName, setDraftName] = useState(portfolio.name);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function startRename() {
    setDraftName(portfolio.name);
    setError(null);
    setMode("renaming");
  }

  function changeDraftName(value: string) {
    setDraftName(value);
    setError(null);
  }

  function cancel() {
    setError(null);
    setMode("view");
  }

  async function submitRename() {
    if (isSaving) return;
    if (normalizePortfolioName(draftName) === portfolio.name) {
      cancel();
      return;
    }
    const problem = portfolioNameError(draftName, portfolios, portfolio.id);
    if (problem) {
      setError(problem);
      return;
    }

    setIsSaving(true);
    const result = await renamePortfolio(portfolio.id, draftName);
    setIsSaving(false);
    if (result.ok) {
      setMode("view");
      return;
    }
    setError(portfolioErrorMessage(result.error));
  }

  // Deleting is only offered for an empty portfolio; the server enforces the same rule.
  function requestDelete() {
    if (transactionCount > 0) {
      setError(blockedDeleteMessage(transactionCount));
      return;
    }
    setError(null);
    setMode("confirming-delete");
  }

  async function confirmDelete() {
    if (isSaving) return;
    setIsSaving(true);
    const result = await removePortfolio(portfolio.id);
    // On success the reactive list removes this row.
    setIsSaving(false);
    if (result.ok) return;
    setMode("view");
    setError(portfolioErrorMessage(result.error));
  }

  return { mode, draftName, error, isSaving, startRename, changeDraftName, cancel, submitRename, requestDelete, confirmDelete };
}
