import type { SelectOption } from "@/components/ui/select-field";

// Plain years: the trimmed period is explained by the summary's period line, not by the option label.
export function yearSelectOptions(years: readonly number[]): SelectOption[] {
  return years.map((year) => {
    const label = String(year);
    return { value: label, label };
  });
}

// Keeps the requested year whenever the scope offers it, so switching scopes and back restores it with
// no synchronisation; otherwise the newest year on offer, which is the default on first render.
export function resolveSelectedYear(requested: number | null, years: readonly number[]): number | null {
  if (requested !== null && years.includes(requested)) return requested;
  return years[0] ?? null;
}
