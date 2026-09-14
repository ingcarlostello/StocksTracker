import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ManagePortfoliosView } from "@/features/portfolio/components/manage-portfolios-view";

export const metadata: Metadata = {
  title: "Portfolios",
};

export default function PortfoliosPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Portfolios" subtitle="Group your investments by goal. Each portfolio keeps its own transactions." />
      <ManagePortfoliosView />
    </div>
  );
}
