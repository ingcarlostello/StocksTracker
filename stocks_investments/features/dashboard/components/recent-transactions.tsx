import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TRANSACTION_LIST_MESSAGES } from "@/features/transactions/transaction-messages.constants";
import { DASHBOARD_SECTION_IDS, DASHBOARD_TEXT } from "../dashboard.constants";
import type { RecentTransactionsModel } from "../dashboard.type";
import { DashboardSection } from "./dashboard-section";
import { RecentTransactionsTable } from "./recent-transactions-table";

type RecentTransactionsProps = {
  recent: RecentTransactionsModel;
};

export function RecentTransactions({ recent }: RecentTransactionsProps) {
  return (
    <DashboardSection
      titleId={DASHBOARD_SECTION_IDS.RECENT}
      title={DASHBOARD_TEXT.RECENT_TITLE}
      action={
        <Link
          href={recent.viewAllHref}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {DASHBOARD_TEXT.VIEW_ALL}
          <span className="sr-only">{DASHBOARD_TEXT.VIEW_ALL_SR_SUFFIX}</span>
          <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </Link>
      }
    >
      {recent.rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          {TRANSACTION_LIST_MESSAGES.EMPTY_SCOPE}
        </p>
      ) : (
        <RecentTransactionsTable
          rows={recent.rows}
          showPortfolioColumn={recent.showPortfolioColumn}
          caption={recent.caption}
        />
      )}
    </DashboardSection>
  );
}
