import { Flame } from "lucide-react";
import { calculatePercentage, getScoreLevel, getScoreClasses } from "@/lib/scores";

interface ScoreIndicatorProps {
  completed: number;
  total: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreIndicator({
  completed,
  total,
  size = "md",
}: ScoreIndicatorProps) {
  const percentage = calculatePercentage(completed, total);
  const level = getScoreLevel(percentage);

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-lg",
  };

  if (level === "fire") {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-orange-100 border border-orange-300 ${sizeClasses[size]}`}
      >
        <Flame className="w-6 h-6 text-orange-500" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg font-bold border ${getScoreClasses(level)} ${sizeClasses[size]}`}
    >
      {percentage}%
    </div>
  );
}
