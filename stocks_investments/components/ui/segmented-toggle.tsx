import type { LucideIcon } from "lucide-react";

export type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: LucideIcon;
};

type SegmentedToggleProps<TValue extends string> = {
  name: string;
  legend: string;
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
};

// Native radio inputs keep arrow-key navigation and screen-reader semantics; the label is the visible control.
export function SegmentedToggle<TValue extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: SegmentedToggleProps<TValue>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
      <div className="flex gap-3">
        {options.map(({ value: optionValue, label, icon: Icon }) => {
          const selected = optionValue === value;
          return (
            <label
              key={optionValue}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                selected
                  ? "border-primary bg-accent-tint text-primary"
                  : "border-border bg-surface-raised text-muted hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={selected}
                onChange={() => onChange(optionValue)}
                className="sr-only"
              />
              {Icon ? <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} /> : null}
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
