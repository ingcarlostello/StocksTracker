import { afterEach, describe, expect, it, vi } from "vitest";
import {
  candidateTradingDates,
  marketToday,
  possibleValuationDates,
  previousWeekday,
  yearEndCandidateDates,
} from "./trading-date.service";

describe("previousWeekday", () => {
  it.each([
    ["2025-09-10", "2025-09-09"], // Wednesday → Tuesday
    ["2025-09-08", "2025-09-05"], // Monday → Friday
    ["2025-09-07", "2025-09-05"], // Sunday → Friday
    ["2025-09-06", "2025-09-05"], // Saturday → Friday
    ["2025-01-01", "2024-12-31"], // across a year boundary
    ["2024-03-01", "2024-02-29"], // leap day
  ])("%s → %s", (date, expected) => {
    expect(previousWeekday(date)).toBe(expected);
  });
});

describe("candidateTradingDates", () => {
  it("returns earlier weekdays, newest first, never today", () => {
    expect(candidateTradingDates("2025-09-09")).toEqual(["2025-09-08", "2025-09-05", "2025-09-04"]);
  });

  it("skips the weekend when today is Monday", () => {
    expect(candidateTradingDates("2025-09-08", 2)).toEqual(["2025-09-05", "2025-09-04"]);
  });
});

describe("yearEndCandidateDates", () => {
  it.each([
    [2025, ["2025-12-31", "2025-12-30", "2025-12-29"]], // Dec 31 is a Wednesday
    [2024, ["2024-12-31", "2024-12-30", "2024-12-27"]], // Dec 28-29 is a weekend
    [2023, ["2023-12-29", "2023-12-28", "2023-12-27"]], // Dec 31 is a Sunday
    [2022, ["2022-12-30", "2022-12-29", "2022-12-28"]], // Dec 31 is a Saturday
  ])("%i ends on %j", (year, expected) => {
    expect(yearEndCandidateDates(year)).toEqual(expected);
  });
});

describe("possibleValuationDates", () => {
  it("covers five weekdays, newest first, including today", () => {
    expect(possibleValuationDates("2026-09-15")).toEqual([
      "2026-09-15",
      "2026-09-14",
      "2026-09-11",
      "2026-09-10",
      "2026-09-09",
    ]);
  });
});

describe("marketToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the New York date on both sides of the DST switch", () => {
    // New York is UTC−5 in February and UTC−4 after the March switch; both instants are 03:30 UTC.
    expect(marketToday(Date.UTC(2025, 1, 15, 3, 30))).toBe("2025-02-14");
    expect(marketToday(Date.UTC(2025, 2, 15, 3, 30))).toBe("2025-03-14");
  });

  it("keeps the previous day while New York has not reached midnight", () => {
    expect(marketToday(Date.UTC(2026, 8, 16, 3, 30))).toBe("2026-09-15");
    expect(marketToday(Date.UTC(2026, 8, 15, 23, 30))).toBe("2026-09-15");
  });

  it("defaults to the current clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 8, 15, 12, 0));
    expect(marketToday()).toBe("2026-09-15");
  });
});
