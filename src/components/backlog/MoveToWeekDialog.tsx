import { useState } from "react";
import { formatWeekRange } from "@/lib/dates";
import type { Week } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface MoveToWeekDialogProps {
  weeks: Week[];
  onMove: (weekId: string) => void;
  onClose: () => void;
}

export function MoveToWeekDialog({
  weeks,
  onMove,
  onClose,
}: MoveToWeekDialogProps) {
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]?.id ?? "");

  return (
    <Modal title="Move to Week" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-gray-600">
          Select a week to add this item as a task.
        </p>

        {weeks.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No weeks available. Create a week first.
          </p>
        ) : (
          <>
            <Select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {formatWeekRange(week.id)}
                </option>
              ))}
            </Select>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => onMove(selectedWeek)} disabled={!selectedWeek}>
                Move to Week
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
