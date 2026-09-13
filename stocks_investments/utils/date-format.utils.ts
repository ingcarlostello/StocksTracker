import { DISPLAY_LOCALE } from "../constants/format.constants";
import { epochMsFromIsoDate, isIsoDate } from "./date.utils";

// ISO dates carry no time zone, so format them in UTC to keep the calendar day unchanged.
const calendarDate = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const localDate = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const localTime = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: "numeric",
  minute: "2-digit",
});

// "2024-11-10" → "Nov 10, 2024". Non-ISO strings (rows edited outside the app) are shown as stored.
export function formatIsoDate(isoDate: string): string {
  return isIsoDate(isoDate) ? calendarDate.format(epochMsFromIsoDate(isoDate)) : isoDate;
}

// Epoch ms in the viewer's local time → "Nov 15, 2024 10:24 AM"
export function formatDateTime(epochMs: number): string {
  return `${localDate.format(epochMs)} ${localTime.format(epochMs)}`;
}
