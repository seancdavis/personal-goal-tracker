import { RotateCcw } from "lucide-react";
import type { WizardRecurringTask } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";

interface WizardStep1RecurringProps {
  tasks: WizardRecurringTask[];
  onToggle: (id: number) => void;
}

export function WizardStep1Recurring({
  tasks,
  onToggle,
}: WizardStep1RecurringProps) {
  const selectedCount = tasks.filter((t) => t.selected).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <RotateCcw className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold">Recurring Tasks</h3>
        <span className="text-sm text-gray-500">
          ({selectedCount} of {tasks.length} selected)
        </span>
      </div>

      <p className="text-gray-600 mb-4">
        These tasks repeat every week. All are pre-selected by default.
      </p>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No recurring tasks defined.{" "}
          <a href="/recurring" className="text-green-600 hover:underline">
            Create some
          </a>
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
              <span className={task.selected ? "" : "text-gray-500"}>
                {task.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
