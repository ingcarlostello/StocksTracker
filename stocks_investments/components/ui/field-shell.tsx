import type { ReactNode } from "react";
import { describeField } from "./field.utils";

type FieldShellProps = {
  id: string;
  label: string;
  // Keeps the label for screen readers when the surrounding UI already names the field.
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

// Label, control and the hint or error below it; the control links to them with describeField.
export function FieldShell({ id, label, hideLabel, hint, error, children }: FieldShellProps) {
  const { hintId, errorId, showHint } = describeField(id, hint, error);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-foreground"}>
        {label}
      </label>
      {children}
      {showHint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
