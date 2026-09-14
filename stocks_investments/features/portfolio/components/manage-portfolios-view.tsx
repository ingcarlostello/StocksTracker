"use client";

import { Card } from "@/components/ui/card";
import { useCreatePortfolioForm } from "../hooks/use-create-portfolio-form.hook";
import { useManagePortfolios } from "../hooks/use-manage-portfolios.hook";
import type { PortfolioOption } from "../portfolio-selection.type";
import { CreatePortfolioForm } from "./create-portfolio-form";
import { ManagedPortfolioRow } from "./managed-portfolio-row";

type PortfoliosManagerProps = {
  portfolios: PortfolioOption[];
  transactionCounts: ReadonlyMap<string, number>;
};

function PortfoliosManager({ portfolios, transactionCounts }: PortfoliosManagerProps) {
  const form = useCreatePortfolioForm(portfolios);

  return (
    <>
      <CreatePortfolioForm
        name={form.name}
        error={form.error}
        isSubmitting={form.isSubmitting}
        onNameChange={form.setName}
        onSubmit={() => void form.submit()}
      />
      <section aria-labelledby="your-portfolios-title" className="flex flex-col gap-4">
        <h2 id="your-portfolios-title" className="text-base font-semibold text-foreground">
          Your portfolios
        </h2>
        {portfolios.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            No portfolios yet. Create your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {portfolios.map((portfolio) => (
              <ManagedPortfolioRow
                key={portfolio.id}
                portfolio={portfolio}
                portfolios={portfolios}
                transactionCount={transactionCounts.get(portfolio.id) ?? 0}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function ManagePortfoliosView() {
  const state = useManagePortfolios();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {state.status === "loading" ? (
        <Card>
          <p className="text-sm text-muted">Loading portfolios…</p>
        </Card>
      ) : (
        <PortfoliosManager portfolios={state.portfolios} transactionCounts={state.transactionCounts} />
      )}
    </div>
  );
}
