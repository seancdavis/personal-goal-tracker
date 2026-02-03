import { useState } from "react";
import { recurringTasksApi } from "@/lib/api";
import type { RecurringTask, Category } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { Spinner } from "@/components/ui/Spinner";

interface RecurringFormProps {
  categories: Category[];
  task?: RecurringTask | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RecurringForm({
  categories,
  task,
  onClose,
  onSaved,
}: RecurringFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(
    task?.categoryId ?? null
  );
  const [content, setContent] = useState(task?.contentMarkdown ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setError(null);

      if (task) {
        await recurringTasksApi.update(task.id, {
          title: title.trim(),
          categoryId,
          contentMarkdown: content || null,
        });
      } else {
        await recurringTasksApi.create({
          title: title.trim(),
          categoryId,
          contentMarkdown: content || null,
          isActive: true,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={task ? "Edit Recurring Task" : "Add Recurring Task"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekly task title"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <Select
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || saving}>
            {saving && <Spinner size="sm" className="mr-2" />}
            {task ? "Save Changes" : "Add Recurring Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
