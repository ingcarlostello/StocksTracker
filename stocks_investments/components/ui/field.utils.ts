export type FieldDescription = {
  hintId: string;
  errorId: string;
  showHint: boolean;
  // Only ids of messages that are actually rendered; undefined when there are none.
  describedBy: string | undefined;
};

// The error replaces the hint, so a field never announces both.
export function describeField(id: string, hint: string | undefined, error: string | undefined): FieldDescription {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const showHint = Boolean(hint) && !error;
  const describedBy = [showHint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return { hintId, errorId, showHint, describedBy: describedBy || undefined };
}

export function fieldControlClassName(hasError: boolean, ...extra: (string | false | undefined)[]): string {
  return [
    "w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
    hasError ? "border-negative" : "border-border-input",
    ...extra,
  ]
    .filter(Boolean)
    .join(" ");
}
