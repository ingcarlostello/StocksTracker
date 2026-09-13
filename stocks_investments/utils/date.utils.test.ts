import { describe, expect, it } from "vitest";
import { addDays, dayIndex, isIsoDate, isoDateFromDayIndex, todayIsoInTimeZone, weekdayOf } from "./date.utils";

describe("day arithmetic", () => {
  it("dayIndex counts days since 1970-01-01", () => {
    expect(dayIndex("1970-01-01")).toBe(0);
    expect(dayIndex("1970-01-02")).toBe(1);
    expect(dayIndex("1969-12-31")).toBe(-1);
  });

  it("round-trips through isoDateFromDayIndex", () => {
    for (const date of ["2024-02-29", "2025-12-31", "2000-01-01"]) {
      expect(isoDateFromDayIndex(dayIndex(date))).toBe(date);
    }
  });

  it("addDays crosses month, year and leap boundaries", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2025-03-10", -365)).toBe("2024-03-10");
  });

  it("weekdayOf returns 0 for Sunday and 6 for Saturday", () => {
    expect(weekdayOf("2025-09-07")).toBe(0);
    expect(weekdayOf("2025-09-08")).toBe(1);
    expect(weekdayOf("2025-09-13")).toBe(6);
  });
});

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
