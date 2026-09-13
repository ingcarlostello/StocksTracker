import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Performance",
};

export default function PerformancePage() {
  return (
    <PageHeader
      title="Performance"
      subtitle="Track your investment performance over time."
    />
  );
}
