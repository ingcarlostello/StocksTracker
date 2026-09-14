import { useState } from "react";
import type { PortfolioOption } from "../portfolio-selection.type";
import { portfolioErrorMessage } from "../portfolio-mutation-error.utils";
import { portfolioNameError } from "../portfolio-management.utils";
import { usePortfolioMutations } from "./use-portfolio-mutations.hook";

export function useCreatePortfolioForm(portfolios: readonly PortfolioOption[]) {
  const { createPortfolio } = usePortfolioMutations();
  const [name, setNameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setName(value: string) {
    setNameValue(value);
    setError(null);
  }

  async function submit() {
    if (isSubmitting) return;
    const problem = portfolioNameError(name, portfolios);
    if (problem) {
      setError(problem);
      return;
    }

    setIsSubmitting(true);
    const result = await createPortfolio(name);
    setIsSubmitting(false);
    if (result.ok) {
      setNameValue("");
      return;
    }
    setError(portfolioErrorMessage(result.error));
  }

  return { name, error, isSubmitting, setName, submit };
}
