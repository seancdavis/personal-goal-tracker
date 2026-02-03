import { AlertCircle } from "lucide-react";
import type { WizardIncompleteTask } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { StalenessIndicator } from "@/components/tasks/StalenessIndicator";

interface WizardStep2IncompleteProps {
  tasks: WizardIncompleteTask[];
  onToggle: (id: number) => void;
}

export function WizardStep2Incomplete({
  tasks,
  onToggle,
}: WizardStep2IncompleteProps) {
  const selectedCount = tasks.filter((t) => t.selected).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-yellow-600" />
        <h3 className="text-lg font-semibold">Incomplete Tasks</h3>
        <span className="text-sm text-gray-500">
          ({selectedCount} of {tasks.length} selected)
        </span>
      </div>

      <p className="text-gray-600 mb-4">
        Tasks from last week that weren't completed. Very stale tasks (4+ weeks)
        are auto-deselected.
      </p>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No incomplete tasks to carry over.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <label
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={task.selected}
                onChange={() => onToggle(task.id)}
              />
              <div className="flex-1 min-w-0">
                <span className={task.selected ? "" : "text-gray-500"}>
                  {task.title}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {task.category && (
                    <Badge variant="secondary">{task.category.name}</Badge>
                  )}
                  {task.stalenessCount > 0 && (
                    <StalenessIndicator count={task.stalenessCount} />
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
