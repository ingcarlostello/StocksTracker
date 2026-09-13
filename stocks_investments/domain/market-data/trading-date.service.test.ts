import { describe, expect, it } from "vitest";
import { candidateTradingDates, previousWeekday } from "./trading-date.service";

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
