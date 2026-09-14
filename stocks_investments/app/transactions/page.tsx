import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes.constants";
import { TransactionsLoading } from "@/features/transactions/components/transactions-loading";
import { TransactionsView } from "@/features/transactions/components/transactions-view";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-8">
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
      {/* Required: TransactionsView reads the URL query with useSearchParams on this prerendered page. */}
      <Suspense fallback={<TransactionsLoading />}>
        <TransactionsView />
      </Suspense>
    </div>
  );
}
