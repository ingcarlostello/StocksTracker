import { describe, expect, it } from "vitest";
import { formatDateTime, formatIsoDate } from "./date-format.utils";

describe("formatIsoDate", () => {
  it.each([
    ["2024-11-10", "Nov 10, 2024"],
    ["2026-01-01", "Jan 1, 2026"],
    ["2024-02-29", "Feb 29, 2024"],
  ])("%s → %s", (isoDate, expected) => {
    expect(formatIsoDate(isoDate)).toBe(expected);
  });

  it.each(["01/15/2025", "2024-11-10T00:00:00Z", ""])("returns non-ISO input %j unchanged instead of throwing", (value) => {
    expect(formatIsoDate(value)).toBe(value);
  });
});

describe("formatDateTime", () => {
  it("matches the mockup format: date, a space, then 12-hour time", () => {
    expect(formatDateTime(Date.UTC(2024, 10, 15, 15, 24))).toMatch(/^Nov 1[45], 2024 \d{1,2}:24\s[AP]M$/);
  });
});
