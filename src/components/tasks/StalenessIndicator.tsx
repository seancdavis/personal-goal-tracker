import { Clock } from "lucide-react";
import { getStalenessDescription } from "@/lib/scores";

interface StalenessIndicatorProps {
  count: number;
}

export function StalenessIndicator({ count }: StalenessIndicatorProps) {
  if (count === 0) return null;

  const colors = {
    1: "text-yellow-500",
    2: "text-orange-500",
    3: "text-red-500",
    4: "text-red-700",
  };

  const color = colors[Math.min(count, 4) as keyof typeof colors];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${color}`}
      title={getStalenessDescription(count)}
    >
      <Clock className="w-3 h-3" />
      <span>{count}w</span>
    </span>
  );
}
