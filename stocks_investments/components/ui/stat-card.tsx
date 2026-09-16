import type { ReactNode } from "react";
import { Card } from "./card";

type StatCardProps = {
  label: string;
  // Muted value, e.g. NOT_AVAILABLE_LABEL. Signed values pass <SignedValue> as children instead.
  muted?: boolean;
  // Small muted line under the value, e.g. how the figure was calculated.
  caption?: string;
  children: ReactNode;
};

// A dt/dd group: render inside a <dl> (a div-wrapped group is valid HTML).
export function StatCard({ label, muted, caption, children }: StatCardProps) {
  return (
    <Card>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${muted ? "text-muted" : "text-foreground"}`}>
        {children}
      </dd>
      {/* A second <dd> for the same <dt>: valid HTML, and it keeps the caption inside the group. */}
      {caption ? <dd className="mt-1 text-xs text-muted">{caption}</dd> : null}
    </Card>
  );
}
