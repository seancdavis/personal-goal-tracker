import { Forward } from "lucide-react";
import type { WizardFollowUp } from "@/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";

interface WizardStep3FollowUpsProps {
  followUps: WizardFollowUp[];
  onToggle: (id: number) => void;
}

export function WizardStep3FollowUps({
  followUps,
  onToggle,
}: WizardStep3FollowUpsProps) {
  const selectedCount = followUps.filter((t) => t.selected).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Forward className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Follow-ups</h3>
        <span className="text-sm text-gray-500">
          ({selectedCount} of {followUps.length} selected)
        </span>
      </div>

      <p className="text-gray-600 mb-4">
        Items you marked as follow-ups during the week. All are pre-selected.
      </p>

      {followUps.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No follow-ups created this week.
        </p>
      ) : (
        <div className="space-y-2">
          {followUps.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={item.selected}
                onChange={() => onToggle(item.id)}
              />
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
