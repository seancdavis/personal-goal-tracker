import type { ScoreLevel } from "@/types";

/**
 * Calculate completion percentage
 */
export function calculatePercentage(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Get score level based on percentage
 */
export function getScoreLevel(percentage: number): ScoreLevel {
  if (percentage >= 90) return "fire";
  if (percentage >= 75) return "green";
  if (percentage >= 50) return "yellow";
  return "red";
}

/**
 * Get CSS classes for score level
 */
export function getScoreClasses(level: ScoreLevel): string {
  switch (level) {
    case "fire":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "green":
      return "bg-green-100 text-green-800 border-green-300";
    case "yellow":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "red":
      return "bg-red-100 text-red-800 border-red-300";
  }
}

/**
 * Get text color for score level
 */
export function getScoreTextColor(level: ScoreLevel): string {
  switch (level) {
    case "fire":
      return "text-orange-600";
    case "green":
      return "text-green-600";
    case "yellow":
      return "text-yellow-600";
    case "red":
      return "text-red-600";
  }
}

/**
 * Get staleness level description
 */
export function getStalenessDescription(count: number): string {
  switch (count) {
    case 0:
      return "New";
    case 1:
      return "Carried over once";
    case 2:
      return "Carried over twice";
    case 3:
      return "Getting stale";
    case 4:
      return "Very stale";
    default:
      return "Extremely stale";
  }
}

/**
 * Get CSS classes for staleness indicator
 */
export function getStalenessClasses(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "border-l-2 border-l-yellow-400";
  if (count === 2) return "border-l-2 border-l-orange-400";
  if (count === 3) return "border-l-2 border-l-red-400";
  return "border-l-4 border-l-red-600";
}
