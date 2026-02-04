import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, Calendar, Plus } from "lucide-react";
import { backlogApi, notesApi, weeksApi } from "@/lib/api";
import { useAsyncData } from "@/hooks";
import { useCategories } from "@/contexts/CategoriesContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AsyncSection } from "@/components/ui/AsyncSection";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { NoteForm } from "@/components/tasks/NoteForm";
import { NoteCard } from "@/components/tasks/NoteCard";
import { BacklogForm } from "@/components/backlog/BacklogForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoveToWeekDialog } from "@/components/backlog/MoveToWeekDialog";

function ItemDetailSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
        </div>
      </div>
    </Card>
  );
}

function NotesListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function BacklogDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const categories = useCategories();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const fetchItem = useCallback(
    () => backlogApi.get(Number(itemId)),
    [itemId]
  );
  const fetchNotes = useCallback(
    () => notesApi.listByBacklogItem(Number(itemId)),
    [itemId]
  );
  // Lazy-load weeks only when move dialog is opened
  const fetchWeeks = useCallback(async () => {
    const data = await weeksApi.list();
    return data.sort((a, b) => b.id.localeCompare(a.id));
  }, []);

  const item = useAsyncData(fetchItem, { deps: [itemId] });
  const notes = useAsyncData(fetchNotes, { deps: [itemId] });
  const weeks = useAsyncData(fetchWeeks, { immediate: false });

  function getCategoryName(): string | null {
    if (!item.data?.categoryId || !categories.data) return null;
    return categories.data.find((c) => c.id === item.data!.categoryId)?.name ?? null;
  }

  async function handleDelete() {
    if (!item.data) return;
    try {
      await backlogApi.delete(item.data.id);
      navigate("/backlog");
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  }

  async function handleMoveToWeek(weekId: string) {
    if (!item.data) return;
    try {
      await backlogApi.moveToWeek(item.data.id, weekId);
      navigate(`/weeks/${weekId}`);
    } catch (err) {
      console.error("Failed to move to week:", err);
    }
  }

  async function handleNoteCreated() {
    setShowNoteForm(false);
    notes.refetch();
  }

  async function handleNoteDeleted(noteId: number) {
    notes.setData((prev) => (prev ? prev.filter((n) => n.id !== noteId) : prev));
  }

  function handleOpenMoveDialog() {
    // Fetch weeks when dialog is opened
    if (!weeks.data) {
      weeks.refetch();
    }
    setShowMoveDialog(true);
  }

  const categoryName = getCategoryName();

  return (
    <div className="space-y-6">
      {/* Back Link - renders immediately */}
      <Link
        to="/backlog"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Backlog
      </Link>

      {/* Item Header */}
      <AsyncSection
        data={item.data}
        loading={item.loading}
        error={item.error}
        onRetry={item.refetch}
        loadingElement={<ItemDetailSkeleton />}
        errorElement={
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{item.error || "Item not found"}</p>
            <Link to="/backlog">
              <Button variant="outline">Back to Backlog</Button>
            </Link>
          </div>
        }
      >
        {(itemData) => (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
                  <Badge variant="outline">Priority #{itemData.priority}</Badge>
                </div>
                <h1 className="text-2xl font-bold mb-2">{itemData.title}</h1>
                {itemData.contentHtml && <MarkdownRenderer html={itemData.contentHtml} />}
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
                onClick={handleOpenMoveDialog}
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
        )}
      </AsyncSection>

      {/* Notes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button size="sm" onClick={() => setShowNoteForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Note
          </Button>
        </div>

        <AsyncSection
          data={notes.data}
          loading={notes.loading}
          error={notes.error}
          onRetry={notes.refetch}
          loadingElement={<NotesListSkeleton />}
          emptyElement={
            <Card className="text-center py-8 text-gray-500">
              No notes yet.
            </Card>
          }
        >
          {(notesList) => (
            <div className="space-y-3">
              {notesList.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onDeleted={() => handleNoteDeleted(note.id)}
                />
              ))}
            </div>
          )}
        </AsyncSection>
      </div>

      {/* Modals */}
      {showNoteForm && item.data && (
        <NoteForm
          backlogItemId={item.data.id}
          onClose={() => setShowNoteForm(false)}
          onSaved={handleNoteCreated}
        />
      )}

      {showEditForm && item.data && categories.data && (
        <BacklogForm
          categories={categories.data}
          item={item.data}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            item.refetch();
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
          weeks={weeks.data ?? []}
          onMove={handleMoveToWeek}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </div>
  );
}
