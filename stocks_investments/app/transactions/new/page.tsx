import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { AddTransactionView } from "@/features/transactions/components/add-transaction-view";

export const metadata: Metadata = {
  title: "Add Transaction",
};

export default function AddTransactionPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Add Transaction" subtitle="Manually add a buy or sell transaction." />
      <AddTransactionView />
    </div>
  );
}
