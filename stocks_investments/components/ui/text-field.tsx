import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  trailingIcon?: LucideIcon;
};

export function TextField({
  id,
  label,
  hint,
  error,
  trailingIcon: TrailingIcon,
  className,
  ...inputProps
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // The error replaces the hint, so only ids that are actually rendered are referenced.
  const showHint = Boolean(hint) && !error;
  const describedBy = [showHint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={[
            "w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
            error ? "border-negative" : "border-border-input",
            TrailingIcon ? "pr-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...inputProps}
        />
        {TrailingIcon ? (
          <TrailingIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
        ) : null}
      </div>
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
