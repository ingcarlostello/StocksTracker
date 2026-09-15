import type { ReactNode } from "react";
import { Card } from "./card";

type StatCardProps = {
  label: string;
  // Muted value, e.g. NOT_AVAILABLE_LABEL. Signed values pass <SignedValue> as children instead.
  muted?: boolean;
  children: ReactNode;
};

// A dt/dd group: render inside a <dl> (a div-wrapped group is valid HTML).
export function StatCard({ label, muted, children }: StatCardProps) {
  return (
    <Card>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${muted ? "text-muted" : "text-foreground"}`}>
        {children}
      </dd>
    </Card>
  );
}
