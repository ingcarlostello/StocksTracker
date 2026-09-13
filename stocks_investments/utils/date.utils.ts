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

export function todayIsoInTimeZone(timeZone: string, now: number): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
