import type { ReactNode } from "react";
import type { DisplaySign } from "@/types/display-sign.type";

const SIGN_CLASSES: Record<DisplaySign, string> = {
  positive: "text-positive",
  negative: "text-negative",
  zero: "text-foreground",
};

type SignedValueProps = {
  // null: the value is unavailable.
  sign: DisplaySign | null;
  // Always text with "+", "-" or "—": the color alone must not carry the meaning.
  children: ReactNode;
};

export function SignedValue({ sign, children }: SignedValueProps) {
  return <span className={sign === null ? "text-muted" : SIGN_CLASSES[sign]}>{children}</span>;
}
