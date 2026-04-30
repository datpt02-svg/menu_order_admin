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

/**
 * Converts a Date object to YYYY-MM-DD string in Asia/Ho_Chi_Minh timezone.
 */
export function toDateStringICT(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
