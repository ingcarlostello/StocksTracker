const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_REGEX.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  // setUTCFullYear avoids Date.UTC mapping years 0–99 to 1900–1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const MS_PER_DAY = 86_400_000;

// Days since 1970-01-01 for a valid ISO date; plain UTC arithmetic, no time zone involved.
export function dayIndex(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return Math.round(date.getTime() / MS_PER_DAY);
}

// Midnight UTC of the ISO date, in epoch ms.
export function epochMsFromIsoDate(isoDate: string): number {
  return dayIndex(isoDate) * MS_PER_DAY;
}

export function isoDateFromDayIndex(index: number): string {
  return new Date(index * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return isoDateFromDayIndex(dayIndex(isoDate) + days);
}

// 0 = Sunday … 6 = Saturday.
export function weekdayOf(isoDate: string): number {
  return new Date(dayIndex(isoDate) * MS_PER_DAY).getUTCDay();
}

export function yearOfIsoDate(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

// Years below 1000 keep the four digits an ISO date needs.
function isoYear(year: number): string {
  return String(year).padStart(4, "0");
}

export function isoYearStart(year: number): string {
  return `${isoYear(year)}-01-01`;
}

export function isoYearEnd(year: number): string {
  return `${isoYear(year)}-12-31`;
}

export function todayIsoInTimeZone(timeZone: string, now: number): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
