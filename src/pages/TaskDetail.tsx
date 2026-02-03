import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Trash2,
  Archive,
  Forward,
  Plus,
} from "lucide-react";
import { tasksApi, notesApi, followUpsApi, categoriesApi } from "@/lib/api";
import { getStalenessDescription, getStalenessClasses } from "@/lib/scores";
import type { TaskWithCategory, Note, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { NoteForm } from "@/components/tasks/NoteForm";
import { NoteCard } from "@/components/tasks/NoteCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { FollowUpForm } from "@/components/tasks/FollowUpForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function TaskDetail() {
  const { weekId, taskId } = useParams<{ weekId: string; taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskWithCategory | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [taskId]);

  async function loadData() {
    try {
      setLoading(true);
      const [taskData, notesData, categoriesData] = await Promise.all([
        tasksApi.get(Number(taskId)),
        notesApi.listByTask(Number(taskId)),
        categoriesApi.list(),
      ]);
      setTask(taskData);
      setNotes(notesData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    if (!task) return;
    try {
      const updated = await tasksApi.toggleStatus(task.id);
      setTask({ ...task, ...updated });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await tasksApi.delete(task.id);
      navigate(`/weeks/${weekId}`);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  async function handleMoveToBacklog() {
    if (!task) return;
    try {
      await tasksApi.moveToBacklog(task.id);
      navigate(`/weeks/${weekId}`);
    } catch (err) {
      console.error("Failed to move to backlog:", err);
    }
  }

  async function handleCreateFollowUp(data: { title: string; content: string }) {
    if (!task) return;
    await followUpsApi.create({
      sourceTaskId: task.id,
      categoryId: task.categoryId,
      title: data.title,
      contentMarkdown: data.content || null,
    });
    setShowFollowUpForm(false);
  }

  async function handleNoteCreated() {
    setShowNoteForm(false);
    const notesData = await notesApi.listByTask(Number(taskId));
    setNotes(notesData);
  }

  async function handleNoteDeleted(noteId: number) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Task not found"}</p>
        <Link to={`/weeks/${weekId}`}>
          <Button variant="outline">Back to Week</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to={`/weeks/${weekId}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Week
      </Link>

      {/* Task Header */}
      <Card className={`p-6 ${getStalenessClasses(task.stalenessCount)}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {task.category && (
                <Badge variant="secondary">{task.category.name}</Badge>
              )}
              {task.isRecurring && <Badge variant="outline">Recurring</Badge>}
              {task.stalenessCount > 0 && (
                <Badge variant="warning">
                  {getStalenessDescription(task.stalenessCount)}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
            {task.contentHtml && (
              <MarkdownRenderer html={task.contentHtml} />
            )}
          </div>
          <Button
            variant={task.status === "completed" ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
          >
            <Check className="w-4 h-4 mr-1" />
            {task.status === "completed" ? "Completed" : "Mark Complete"}
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
            No notes yet. Add a note to track progress or details.
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
          taskId={task.id}
          onClose={() => setShowNoteForm(false)}
          onSaved={handleNoteCreated}
        />
      )}

      {showEditForm && (
        <TaskForm
          weekId={weekId!}
          categories={categories}
          task={task}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            loadData();
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
