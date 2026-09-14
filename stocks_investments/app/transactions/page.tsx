import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <PageHeader
      title="Transactions"
      subtitle="View and manage all your transactions."
      actions={
        <ButtonLink href={ROUTES.ADD_TRANSACTION}>
          <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
          Add Transaction
        </ButtonLink>
      }
    />
  );
}
