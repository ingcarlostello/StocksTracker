import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return (
    <PageHeader
      title="Portfolio"
      subtitle="See all your holdings and their performance."
    />
  );
}
