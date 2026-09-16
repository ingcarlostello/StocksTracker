import { MARKET_TIME_ZONE } from "../transactions/transaction.constants";
import { addDays, isoYearStart, todayIsoInTimeZone, weekdayOf } from "../../utils/date.utils";
import { MAX_CANDIDATE_TRADING_DATES, VALUATION_CANDIDATE_DATES } from "./market-data.constants";

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

// Candidates for a year's closing value: the weekdays on or before Dec 31, newest first. Dec 31 is a
// trading day whenever it is a weekday, so the first candidate with data is never far down the list.
export function yearEndCandidateDates(year: number): string[] {
  return candidateTradingDates(isoYearStart(year + 1));
}

// Every date the server's own walk can settle on, seen from the client's today: the server answers with one
// of its 3 candidates, and a day of clock skew either way keeps that date inside these 5.
export function possibleValuationDates(today: string): string[] {
  return candidateTradingDates(addDays(today, 1), VALUATION_CANDIDATE_DATES);
}

// Today's date in New York, as the server validates trade dates. Reads the clock, so pure callers do not.
export function marketToday(now: number = Date.now()): string {
  return todayIsoInTimeZone(MARKET_TIME_ZONE, now);
}
