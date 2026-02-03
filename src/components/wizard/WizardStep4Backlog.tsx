import { Archive } from "lucide-react";
import type { WizardBacklogItem } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";

interface WizardStep4BacklogProps {
  items: WizardBacklogItem[];
  onToggle: (id: number) => void;
}

export function WizardStep4Backlog({
  items,
  onToggle,
}: WizardStep4BacklogProps) {
  const selectedCount = items.filter((t) => t.selected).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Archive className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold">Backlog</h3>
        <span className="text-sm text-gray-500">
          ({selectedCount} of {items.length} selected)
        </span>
      </div>

      <p className="text-gray-600 mb-4">
        Pull items from your backlog. None are selected by default.
      </p>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Your backlog is empty.{" "}
          <a href="/backlog" className="text-green-600 hover:underline">
            Add items
          </a>
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <label
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={item.selected}
                onChange={() => onToggle(item.id)}
              />
              <span className="text-sm text-gray-400 w-6">#{index + 1}</span>
              <div className="flex-1 min-w-0">
                <span className={item.selected ? "" : "text-gray-500"}>
                  {item.title}
                </span>
                {item.category && (
                  <div className="mt-1">
                    <Badge variant="secondary">{item.category.name}</Badge>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
