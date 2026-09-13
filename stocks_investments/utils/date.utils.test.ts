import { describe, expect, it } from "vitest";
import { isIsoDate, todayIsoInTimeZone } from "./date.utils";

describe("isIsoDate", () => {
  it.each(["2025-03-14", "2024-02-29", "0099-12-31", "0000-01-01"])("accepts %j", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each([
    "2025-02-29",
    "2025-02-30",
    "2025-13-01",
    "2025-00-10",
    "2025-1-2",
    " 2025-01-02",
    "2025-01-02 ",
    "2025-01-02T00:00",
    "2025-01-022",
    "20250102",
  ])(
    "rejects %j",
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe("todayIsoInTimeZone", () => {
  // 2025-03-15T03:30Z is still March 14 in New York (UTC−4 after the DST switch).
  const instant = Date.UTC(2025, 2, 15, 3, 30);

  it("formats the calendar date in the given zone", () => {
    expect(todayIsoInTimeZone("America/New_York", instant)).toBe("2025-03-14");
    expect(todayIsoInTimeZone("UTC", instant)).toBe("2025-03-15");
  });
});
