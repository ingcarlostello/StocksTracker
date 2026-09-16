import { describe, expect, it } from "vitest";
import { resolveSelectedYear, yearSelectOptions } from "./performance-year.utils";

describe("yearSelectOptions", () => {
  it("offers the plain years, newest first, as its own value and label", () => {
    expect(yearSelectOptions([2026, 2025, 2024])).toEqual([
      { value: "2026", label: "2026" },
      { value: "2025", label: "2025" },
      { value: "2024", label: "2024" },
    ]);
  });

  it("offers nothing when the scope has no years", () => {
    expect(yearSelectOptions([])).toEqual([]);
  });
});

describe("resolveSelectedYear", () => {
  it("defaults to the newest year on offer", () => {
    expect(resolveSelectedYear(null, [2026, 2025])).toBe(2026);
  });

  it("keeps the requested year while the scope offers it", () => {
    expect(resolveSelectedYear(2025, [2026, 2025])).toBe(2025);
  });

  it("falls back to the newest year when the scope no longer offers the requested one", () => {
    expect(resolveSelectedYear(2025, [2026])).toBe(2026);
  });

  it("resolves to no year at all when the scope has no transactions", () => {
    expect(resolveSelectedYear(null, [])).toBeNull();
    expect(resolveSelectedYear(2025, [])).toBeNull();
  });
});
