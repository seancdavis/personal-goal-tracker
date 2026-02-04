import { useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Trash2,
  Archive,
  Forward,
  Plus,
} from "lucide-react";
import { tasksApi, notesApi, followUpsApi } from "@/lib/api";
import { getStalenessDescription, getStalenessClasses } from "@/lib/scores";
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
import { TaskForm } from "@/components/tasks/TaskForm";
import { FollowUpForm } from "@/components/tasks/FollowUpForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function TaskDetailSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-32 rounded" />
      </div>
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-24 rounded" />
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

export function TaskDetail() {
  const { weekId, taskId } = useParams<{ weekId: string; taskId: string }>();
  const navigate = useNavigate();
  const categories = useCategories();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchTask = useCallback(
    () => tasksApi.get(Number(taskId)),
    [taskId]
  );
  const fetchNotes = useCallback(
    () => notesApi.listByTask(Number(taskId)),
    [taskId]
  );

  const task = useAsyncData(fetchTask, { deps: [taskId] });
  const notes = useAsyncData(fetchNotes, { deps: [taskId] });

  async function handleToggle() {
    if (!task.data) return;
    try {
      const updated = await tasksApi.toggleStatus(task.data.id);
      task.setData((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  }

  async function handleDelete() {
    if (!task.data) return;
    try {
      await tasksApi.delete(task.data.id);
      navigate(`/weeks/${weekId}`);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  async function handleMoveToBacklog() {
    if (!task.data) return;
    try {
      await tasksApi.moveToBacklog(task.data.id);
      navigate(`/weeks/${weekId}`);
    } catch (err) {
      console.error("Failed to move to backlog:", err);
    }
  }

  async function handleCreateFollowUp(data: { title: string; content: string }) {
    if (!task.data) return;
    await followUpsApi.create({
      sourceTaskId: task.data.id,
      categoryId: task.data.categoryId,
      title: data.title,
      contentMarkdown: data.content || null,
    });
    setShowFollowUpForm(false);
  }

  async function handleNoteCreated() {
    setShowNoteForm(false);
    notes.refetch();
  }

  async function handleNoteDeleted(noteId: number) {
    notes.setData((prev) => (prev ? prev.filter((n) => n.id !== noteId) : prev));
  }

  return (
    <div className="space-y-6">
      {/* Back Link - renders immediately */}
      <Link
        to={`/weeks/${weekId}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Week
      </Link>

      {/* Task Header */}
      <AsyncSection
        data={task.data}
        loading={task.loading}
        error={task.error}
        onRetry={task.refetch}
        loadingElement={<TaskDetailSkeleton />}
        errorElement={
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{task.error || "Task not found"}</p>
            <Link to={`/weeks/${weekId}`}>
              <Button variant="outline">Back to Week</Button>
            </Link>
          </div>
        }
      >
        {(taskData) => (
          <Card className={`p-6 ${getStalenessClasses(taskData.stalenessCount)}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {taskData.category && (
                    <Badge variant="secondary">{taskData.category.name}</Badge>
                  )}
                  {taskData.isRecurring && <Badge variant="outline">Recurring</Badge>}
                  {taskData.stalenessCount > 0 && (
                    <Badge variant="warning">
                      {getStalenessDescription(taskData.stalenessCount)}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-2">{taskData.title}</h1>
                {taskData.contentHtml && (
                  <MarkdownRenderer html={taskData.contentHtml} />
                )}
              </div>
              <Button
                variant={taskData.status === "completed" ? "default" : "outline"}
                size="sm"
                onClick={handleToggle}
              >
                <Check className="w-4 h-4 mr-1" />
                {taskData.status === "completed" ? "Completed" : "Mark Complete"}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={() => setShowEditForm(true)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFollowUpForm(true)}
              >
                <Forward className="w-4 h-4 mr-1" />
                Follow-up
              </Button>
              <Button variant="ghost" size="sm" onClick={handleMoveToBacklog}>
                <Archive className="w-4 h-4 mr-1" />
                Move to Backlog
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
              No notes yet. Add a note to track progress or details.
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
      {showNoteForm && task.data && (
        <NoteForm
          taskId={task.data.id}
          onClose={() => setShowNoteForm(false)}
          onSaved={handleNoteCreated}
        />
      )}

      {showEditForm && task.data && categories.data && (
        <TaskForm
          weekId={weekId!}
          categories={categories.data}
          task={task.data}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            task.refetch();
          }}
        />
      )}

      {showFollowUpForm && (
        <FollowUpForm
          onClose={() => setShowFollowUpForm(false)}
          onSave={handleCreateFollowUp}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
