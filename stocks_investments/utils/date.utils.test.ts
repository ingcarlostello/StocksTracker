import { describe, expect, it } from "vitest";
import {
  addDays,
  dayIndex,
  isIsoDate,
  isoDateFromDayIndex,
  isoYearEnd,
  isoYearStart,
  todayIsoInTimeZone,
  weekdayOf,
  yearOfIsoDate,
} from "./date.utils";

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

describe("year boundaries", () => {
  it("reads the year of an ISO date", () => {
    expect(yearOfIsoDate("2025-12-31")).toBe(2025);
    expect(yearOfIsoDate("2026-01-01")).toBe(2026);
  });

  it("builds the first and last day of a year", () => {
    expect(isoYearStart(2025)).toBe("2025-01-01");
    expect(isoYearEnd(2025)).toBe("2025-12-31");
  });

  it("keeps four digits for a year below 1000", () => {
    expect(isoYearStart(99)).toBe("0099-01-01");
    expect(isoYearEnd(99)).toBe("0099-12-31");
    expect(isIsoDate(isoYearEnd(99))).toBe(true);
    expect(yearOfIsoDate(isoYearStart(99))).toBe(99);
  });

  it("round-trips through dayIndex", () => {
    for (const year of [1970, 2023, 2024, 2025, 2026]) {
      expect(isoDateFromDayIndex(dayIndex(isoYearStart(year)))).toBe(isoYearStart(year));
      expect(addDays(isoYearEnd(year), 1)).toBe(isoYearStart(year + 1));
      expect(yearOfIsoDate(isoYearEnd(year))).toBe(year);
    }
  });

  it("measures 366 days in a leap year and 365 otherwise", () => {
    expect(dayIndex(isoYearStart(2025)) - dayIndex(isoYearStart(2024))).toBe(366);
    expect(dayIndex(isoYearStart(2026)) - dayIndex(isoYearStart(2025))).toBe(365);
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
