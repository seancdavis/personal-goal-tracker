import { Link } from "react-router-dom";
import { RotateCcw, ChevronRight } from "lucide-react";
import type { TaskWithCategory } from "@/types";
import { getStalenessClasses } from "@/lib/scores";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { StalenessIndicator } from "./StalenessIndicator";

interface TaskCardProps {
  task: TaskWithCategory;
  weekId: string;
  onToggle: () => void;
}

export function TaskCard({ task, weekId, onToggle }: TaskCardProps) {
  return (
    <Card
      className={`flex items-center gap-3 p-4 group ${getStalenessClasses(task.stalenessCount)}`}
    >
      <Checkbox
        checked={task.status === "completed"}
        onChange={onToggle}
      />

      <Link
        to={`/weeks/${weekId}/tasks/${task.id}`}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium truncate ${
              task.status === "completed" ? "text-gray-500 line-through" : ""
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {task.isRecurring && (
              <RotateCcw className="w-3 h-3 text-gray-400" />
            )}
            {task.stalenessCount > 0 && (
              <StalenessIndicator count={task.stalenessCount} />
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </Card>
  );
}
