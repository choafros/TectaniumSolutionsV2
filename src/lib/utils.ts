import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts decimal hours into a "XX hrs YY mins" format.
 * @param decimalHours The hours as a decimal (e.g., 8.5) or string "8.50"
 * @returns A formatted string (e.g., "8 hrs 30 mins")
 */
export function formatHoursAndMinutes(decimalHours: string | number): string {
  const totalHoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
  
  if (isNaN(totalHoursNum)) {
    return '0 hrs 0 mins';
  }

  // Round to the nearest minute to handle floating point inaccuracies
  const totalMinutes = Math.round(totalHoursNum * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} hrs ${minutes} mins`;
}