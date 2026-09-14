"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes.constants";
import { useIsClient } from "@/hooks/use-is-client.hook";
import { useTransactionForm } from "../hooks/use-transaction-form.hook";
import { TransactionForm } from "./transaction-form";

function AddTransactionForm() {
  const router = useRouter();
  const form = useTransactionForm({ onCreated: () => router.push(ROUTES.TRANSACTIONS) });

  return (
    <TransactionForm
      values={form.values}
      sizeDisplay={form.sizeDisplay}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      isSubmitting={form.isSubmitting}
      maxDate={form.maxDate}
      cancelHref={ROUTES.TRANSACTIONS}
      onTypeChange={form.setType}
      onFieldChange={form.setField}
      onSizeChange={form.setSize}
      onSubmit={() => void form.submit()}
    />
  );
}

// The default and max date come from the viewer's clock, so the form is rendered only in the browser.
export function AddTransactionView() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <Card className="max-w-xl">
        <p className="text-sm text-muted">Loading form…</p>
      </Card>
    );
  }
  return <AddTransactionForm />;
}
