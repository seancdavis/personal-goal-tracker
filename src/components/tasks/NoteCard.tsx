import { useState } from "react";
import { Trash2 } from "lucide-react";
import { notesApi } from "@/lib/api";
import type { Note } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

interface NoteCardProps {
  note: Note;
  onDeleted: () => void;
}

export function NoteCard({ note, onDeleted }: NoteCardProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    try {
      setDeleting(true);
      await notesApi.delete(note.id);
      onDeleted();
    } catch (err) {
      console.error("Failed to delete note:", err);
      setDeleting(false);
    }
  }

  const date = new Date(note.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <MarkdownRenderer html={note.contentHtml} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-2">{date}</p>
    </Card>
  );
}
