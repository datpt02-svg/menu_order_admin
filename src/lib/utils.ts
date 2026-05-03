import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // Check if it's already in DD/MM/YYYY or something else
  if (!dateStr.includes("-")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Returns today's date in YYYY-MM-DD format, specifically for Asia/Ho_Chi_Minh timezone.
 */
export function getTodayDateString(): string {
  return toDateStringICT(new Date());
}

const ICT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const ICT_OFFSET_HOURS = 7;

function formatCalendarDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ICT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const partValue = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    date: `${partValue("year")}-${partValue("month")}-${partValue("day")}`,
    time: `${partValue("hour")}:${partValue("minute")}`,
  };
}

export function buildCalendarDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function addMinutesToCalendarDateTime(date: string, time: string, minutes: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const nextDate = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, (hour ?? 0) - ICT_OFFSET_HOURS, (minute ?? 0) + minutes));
  const nextParts = formatCalendarDateTimeParts(nextDate);

  return buildCalendarDateTime(nextParts.date, nextParts.time);
}

export function getCalendarDateTimeParts(date: Date): { date: string; time: string } {
  return formatCalendarDateTimeParts(date);
}

export function toCalendarDateTime(date: Date): string {
  const parts = formatCalendarDateTimeParts(date);
  return buildCalendarDateTime(parts.date, parts.time);
}

export function toDateStringICT(date: Date): string {
  return formatCalendarDateTimeParts(date).date;
}
