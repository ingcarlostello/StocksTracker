import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EditTransactionView } from "@/features/transactions/components/edit-transaction-view";
import {
  parseTransactionListQuery,
  transactionsListHref,
} from "@/features/transactions/transaction-list-query.utils";
import { searchParamsFromRecord } from "@/utils/route.utils";

export const metadata: Metadata = {
  title: "Edit Transaction",
};

export default async function EditTransactionPage(props: PageProps<"/transactions/[id]/edit">) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  // Rebuilt from whitelisted, re-serialized list filters, so the return link can only point at the list.
  const returnHref = transactionsListHref(parseTransactionListQuery(searchParamsFromRecord(query)));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Edit Transaction" subtitle="Correct a saved buy or sell transaction." />
      <EditTransactionView transactionId={id} returnHref={returnHref} />
    </div>
  );
}
