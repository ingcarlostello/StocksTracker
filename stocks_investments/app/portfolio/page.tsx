import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioView } from "@/features/portfolio/components/portfolio-view";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Portfolio" subtitle="See all your holdings and their performance." />
      <PortfolioView />
    </div>
  );
}
