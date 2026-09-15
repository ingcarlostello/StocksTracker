// Sign of a value as displayed after rounding: "$0.00" and "0.00%" are "zero".
export type DisplaySign = "positive" | "negative" | "zero";

export type SignedLabel = { label: string; sign: DisplaySign };

// sign null ⇒ value unavailable; label is NOT_AVAILABLE_LABEL and renders muted.
export type SignedCell = SignedLabel | { label: string; sign: null };
