import type { ReactNode } from "react";

type BadgeTone = "positive" | "negative";

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive: "border-positive/50 bg-buy-tint text-positive",
  negative: "border-negative/50 bg-sell-tint text-negative",
};

type BadgeProps = {
  tone: BadgeTone;
  // Always text: the tone color alone must not carry the meaning.
  children: ReactNode;
};

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
