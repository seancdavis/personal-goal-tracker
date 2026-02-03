import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, Calendar, Plus } from "lucide-react";
import { backlogApi, notesApi, weeksApi, categoriesApi } from "@/lib/api";
import type { BacklogItem, Note, Week, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { NoteForm } from "@/components/tasks/NoteForm";
import { NoteCard } from "@/components/tasks/NoteCard";
import { BacklogForm } from "@/components/backlog/BacklogForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoveToWeekDialog } from "@/components/backlog/MoveToWeekDialog";

export function BacklogDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<BacklogItem | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [itemId]);

  async function loadData() {
    try {
      setLoading(true);
      const [itemData, notesData, weeksData, categoriesData] = await Promise.all([
        backlogApi.get(Number(itemId)),
        notesApi.listByBacklogItem(Number(itemId)),
        weeksApi.list(),
        categoriesApi.list(),
      ]);
      setItem(itemData);
      setNotes(notesData);
      setWeeks(weeksData.sort((a, b) => b.id.localeCompare(a.id)));
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    try {
      await backlogApi.delete(item.id);
      navigate("/backlog");
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  }

  async function handleMoveToWeek(weekId: string) {
    if (!item) return;
    try {
      await backlogApi.moveToWeek(item.id, weekId);
      navigate(`/weeks/${weekId}`);
    } catch (err) {
      console.error("Failed to move to week:", err);
    }
  }

  async function handleNoteCreated() {
    setShowNoteForm(false);
    const notesData = await notesApi.listByBacklogItem(Number(itemId));
    setNotes(notesData);
  }

  async function handleNoteDeleted(noteId: number) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  function getCategoryName(): string | null {
    if (!item?.categoryId) return null;
    return categories.find((c) => c.id === item.categoryId)?.name ?? null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Item not found"}</p>
        <Link to="/backlog">
          <Button variant="outline">Back to Backlog</Button>
        </Link>
      </div>
    );
  }

  const categoryName = getCategoryName();

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/backlog"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Backlog
      </Link>

      {/* Item Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
              <Badge variant="outline">Priority #{item.priority}</Badge>
            </div>
            <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
            {item.contentHtml && <MarkdownRenderer html={item.contentHtml} />}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={() => setShowEditForm(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoveDialog(true)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Move to Week
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </Card>

      {/* Notes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button size="sm" onClick={() => setShowNoteForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Note
          </Button>
        </div>

        {notes.length === 0 ? (
          <Card className="text-center py-8 text-gray-500">
            No notes yet.
          </Card>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDeleted={() => handleNoteDeleted(note.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNoteForm && (
        <NoteForm
          backlogItemId={item.id}
          onClose={() => setShowNoteForm(false)}
          onSaved={handleNoteCreated}
        />
      )}

      {showEditForm && (
        <BacklogForm
          categories={categories}
          item={item}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            loadData();
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Item"
          message="Are you sure you want to delete this backlog item?"
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showMoveDialog && (
        <MoveToWeekDialog
          weeks={weeks}
          onMove={handleMoveToWeek}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </div>
  );
}
