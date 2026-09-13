import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <PageHeader
      title="Transactions"
      subtitle="View and manage all your transactions."
    />
  );
}
