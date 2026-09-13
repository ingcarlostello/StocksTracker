import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <PageHeader
      title="Dashboard"
      subtitle="Here's an overview of your investments."
    />
  );
}
