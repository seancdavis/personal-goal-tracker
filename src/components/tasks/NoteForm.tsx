import { useState } from "react";
import { notesApi } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { Spinner } from "@/components/ui/Spinner";

interface NoteFormProps {
  taskId?: number;
  backlogItemId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export function NoteForm({
  taskId,
  backlogItemId,
  onClose,
  onSaved,
}: NoteFormProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSaving(true);
      setError(null);

      await notesApi.create({
        taskId: taskId ?? null,
        backlogItemId: backlogItemId ?? null,
        contentMarkdown: content.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Note" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Add a note..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!content.trim() || saving}>
            {saving && <Spinner size="sm" className="mr-2" />}
            Add Note
          </Button>
        </div>
      </form>
    </Modal>
  );
}
