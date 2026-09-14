import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { FieldShell } from "./field-shell";
import { describeField, fieldControlClassName } from "./field.utils";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  trailingIcon?: LucideIcon;
};

export function TextField({
  id,
  label,
  hideLabel,
  hint,
  error,
  trailingIcon: TrailingIcon,
  className,
  ...inputProps
}: TextFieldProps) {
  const { describedBy } = describeField(id, hint, error);

  return (
    <FieldShell id={id} label={label} hideLabel={hideLabel} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={fieldControlClassName(Boolean(error), TrailingIcon ? "pr-10" : undefined, className)}
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
    </FieldShell>
  );
}
