import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { Spinner } from "@/components/ui/Spinner";

interface FollowUpFormProps {
  onClose: () => void;
  onSave: (data: { title: string; content: string }) => Promise<void>;
}

export function FollowUpForm({ onClose, onSave }: FollowUpFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await onSave({ title: title.trim(), content });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create follow-up");
      setSaving(false);
    }
  }

  return (
    <Modal title="Create Follow-up" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          This creates a follow-up item that will appear in the wizard when
          generating next week's tasks.
        </p>

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
            placeholder="Follow-up task title"
            autoFocus
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
            Create Follow-up
          </Button>
        </div>
      </form>
    </Modal>
  );
}
