import { useState } from "react";
import { backlogApi } from "@/lib/api";
import type { BacklogItem, Category } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { Spinner } from "@/components/ui/Spinner";

interface BacklogFormProps {
  categories: Category[];
  item?: BacklogItem;
  onClose: () => void;
  onSaved: () => void;
}

export function BacklogForm({
  categories,
  item,
  onClose,
  onSaved,
}: BacklogFormProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(
    item?.categoryId ?? null
  );
  const [content, setContent] = useState(item?.contentMarkdown ?? "");
  const [priority, setPriority] = useState(item?.priority ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setError(null);

      if (item) {
        await backlogApi.update(item.id, {
          title: title.trim(),
          categoryId,
          contentMarkdown: content || null,
          priority,
        });
      } else {
        await backlogApi.create({
          title: title.trim(),
          categoryId,
          contentMarkdown: content || null,
          priority,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
      setSaving(false);
    }
  }

  return (
    <Modal title={item ? "Edit Backlog Item" : "Add Backlog Item"} onClose={onClose}>
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
            placeholder="What's on your backlog?"
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
            Priority (lower = higher priority)
          </label>
          <Input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            min={0}
          />
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
            {item ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
