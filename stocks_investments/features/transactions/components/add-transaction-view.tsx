"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes.constants";
import { NoPortfoliosNotice } from "@/features/portfolio/components/no-portfolios-notice";
import { useActivePortfolio } from "@/features/portfolio/hooks/use-active-portfolio.hook";
import { portfolioSelectOptions } from "@/features/portfolio/portfolio-options.utils";
import type { PortfolioOption } from "@/features/portfolio/portfolio-selection.type";
import { useIsClient } from "@/hooks/use-is-client.hook";
import { useTransactionForm } from "../hooks/use-transaction-form.hook";
import { TRANSACTION_SUBMIT_LABELS } from "../transaction-form.constants";
import { defaultFormPortfolioId } from "../transaction-form.utils";
import { TransactionForm } from "./transaction-form";

type AddTransactionFormProps = {
  portfolios: PortfolioOption[];
  defaultPortfolioId: string;
};

function AddTransactionForm({ portfolios, defaultPortfolioId }: AddTransactionFormProps) {
  const router = useRouter();
  const form = useTransactionForm({
    portfolios,
    defaultPortfolioId,
    onCreated: () => router.push(ROUTES.TRANSACTIONS),
  });
  const portfolioOptions = useMemo(() => portfolioSelectOptions(portfolios), [portfolios]);

  return (
    <TransactionForm
      values={form.values}
      portfolioOptions={portfolioOptions}
      sizeDisplay={form.sizeDisplay}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      isSubmitting={form.isSubmitting}
      maxDate={form.maxDate}
      cancelHref={ROUTES.TRANSACTIONS}
      submitLabel={TRANSACTION_SUBMIT_LABELS.create.idle}
      submittingLabel={TRANSACTION_SUBMIT_LABELS.create.pending}
      onTypeChange={form.setType}
      onFieldChange={form.setField}
      onSizeChange={form.setSize}
      onSubmit={() => void form.submit()}
    />
  );
}

// The default and max date come from the viewer's clock, and the default portfolio from the browser's
// saved selection, so the form is rendered only in the browser once the portfolios are loaded.
export function AddTransactionView() {
  const isClient = useIsClient();
  const activePortfolio = useActivePortfolio();

  if (!isClient || activePortfolio.status === "loading") {
    return (
      <Card className="max-w-xl">
        <p className="text-sm text-muted">Loading form…</p>
      </Card>
    );
  }
  if (activePortfolio.portfolios.length === 0) {
    return <NoPortfoliosNotice createHref={ROUTES.PORTFOLIOS} />;
  }
  return (
    <AddTransactionForm
      portfolios={activePortfolio.portfolios}
      defaultPortfolioId={defaultFormPortfolioId(activePortfolio.active, activePortfolio.portfolios)}
    />
  );
}
