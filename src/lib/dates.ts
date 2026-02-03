/**
 * Get the current week ID in "YYYY-WW" format
 */
export function getCurrentWeekId(): string {
  return getWeekId(new Date());
}

/**
 * Get week ID for a given date in "YYYY-WW" format
 */
export function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-${week.toString().padStart(2, "0")}`;
}

/**
 * Get the ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the next week ID
 */
export function getNextWeekId(weekId: string): string {
  const [year, week] = weekId.split("-").map(Number);
  const weeksInYear = getWeeksInYear(year);

  if (week >= weeksInYear) {
    return `${year + 1}-01`;
  }
  return `${year}-${(week + 1).toString().padStart(2, "0")}`;
}

/**
 * Get the previous week ID
 */
export function getPreviousWeekId(weekId: string): string {
  const [year, week] = weekId.split("-").map(Number);

  if (week <= 1) {
    const prevYear = year - 1;
    const weeksInPrevYear = getWeeksInYear(prevYear);
    return `${prevYear}-${weeksInPrevYear.toString().padStart(2, "0")}`;
  }
  return `${year}-${(week - 1).toString().padStart(2, "0")}`;
}

/**
 * Get number of ISO weeks in a year
 */
export function getWeeksInYear(year: number): number {
  const dec31 = new Date(year, 11, 31);
  const week = getWeekNumber(dec31);
  return week === 1 ? getWeekNumber(new Date(year, 11, 24)) : week;
}

/**
 * Get the start date (Monday) of a week
 */
export function getWeekStartDate(weekId: string): Date {
  const [year, week] = weekId.split("-").map(Number);
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4DayOfWeek + 1);
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
  return targetDate;
}

/**
 * Get the end date (Sunday) of a week
 */
export function getWeekEndDate(weekId: string): Date {
  const startDate = getWeekStartDate(weekId);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate;
}

/**
 * Format date as "Mon, Jan 5"
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format week range as "Jan 5 - Jan 11, 2026"
 */
export function formatWeekRange(weekId: string): string {
  const start = getWeekStartDate(weekId);
  const end = getWeekEndDate(weekId);
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

/**
 * Parse week ID into year and week components
 */
export function parseWeekId(weekId: string): { year: number; week: number } {
  const [year, week] = weekId.split("-").map(Number);
  return { year, week };
}

/**
 * Validate week ID format
 */
export function isValidWeekId(weekId: string): boolean {
  const match = weekId.match(/^(\d{4})-(\d{2})$/);
  if (!match) return false;
  const [, yearStr, weekStr] = match;
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  return week >= 1 && week <= getWeeksInYear(year);
}
