import { ChevronDown } from "lucide-react";
import { FieldShell } from "./field-shell";
import { describeField, fieldControlClassName } from "./field.utils";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  id: string;
  label: string;
  hideLabel?: boolean;
  value: string;
  options: readonly SelectOption[];
  // Shown, and not selectable again, while value is "".
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

// Native select: keyboard, mobile pickers and screen readers work without extra code.
export function SelectField({
  id,
  label,
  hideLabel,
  value,
  options,
  placeholder,
  hint,
  error,
  disabled,
  onChange,
}: SelectFieldProps) {
  const { describedBy } = describeField(id, hint, error);

  return (
    <FieldShell id={id} label={label} hideLabel={hideLabel} hint={hint} error={error}>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={fieldControlClassName(
            Boolean(error),
            "appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50",
            value === "" && "text-muted",
          )}
          onChange={(event) => onChange(event.target.value)}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          strokeWidth={1.75}
        />
      </div>
    </FieldShell>
  );
}
