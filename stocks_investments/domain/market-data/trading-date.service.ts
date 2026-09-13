import { addDays, weekdayOf } from "../../utils/date.utils";
import { MAX_CANDIDATE_TRADING_DATES } from "./market-data.constants";

function isWeekend(isoDate: string): boolean {
  const weekday = weekdayOf(isoDate);
  return weekday === 0 || weekday === 6;
}

// Latest weekday strictly before `isoDate`. Holidays are not known here; callers fall back to older candidates.
export function previousWeekday(isoDate: string): string {
  let candidate = addDays(isoDate, -1);
  while (isWeekend(candidate)) candidate = addDays(candidate, -1);
  return candidate;
}

// Candidate dates for the latest published close, newest first; today's close is never requested.
export function candidateTradingDates(
  today: string,
  count: number = MAX_CANDIDATE_TRADING_DATES,
): string[] {
  const dates: string[] = [];
  let cursor = today;
  for (let i = 0; i < count; i += 1) {
    cursor = previousWeekday(cursor);
    dates.push(cursor);
  }
  return dates;
}
