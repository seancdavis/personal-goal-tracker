import { useEffect, useState } from "react";
import { Plus, RotateCcw, Pause, Play, Trash2 } from "lucide-react";
import { recurringTasksApi, categoriesApi } from "@/lib/api";
import type { RecurringTask, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { RecurringForm } from "@/components/recurring/RecurringForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function Recurring() {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [tasksData, categoriesData] = await Promise.all([
        recurringTasksApi.list(),
        categoriesApi.list(),
      ]);
      setTasks(tasksData);
      setCategories(categoriesData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load recurring tasks"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await recurringTasksApi.toggle(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  }

  async function handleDelete(id: number) {
    try {
      await recurringTasksApi.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setDeletingTaskId(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  function getCategoryName(categoryId: number | null): string | null {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.isActive);
  const inactiveTasks = tasks.filter((t) => !t.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recurring Tasks</h1>
          <p className="text-gray-600">
            Tasks that automatically appear in every new week
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Recurring Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="text-center py-12">
          <RotateCcw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            No recurring tasks yet. Create tasks that repeat every week.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Recurring Task
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Tasks */}
          {activeTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active ({activeTasks.length})
              </h2>
              <div className="space-y-2">
                {activeTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    categoryName={getCategoryName(task.categoryId)}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={() => {
                      setEditingTask(task);
                      setShowForm(true);
                    }}
                    onDelete={() => setDeletingTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Tasks */}
          {inactiveTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Paused ({inactiveTasks.length})
              </h2>
              <div className="space-y-2">
                {inactiveTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    categoryName={getCategoryName(task.categoryId)}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={() => {
                      setEditingTask(task);
                      setShowForm(true);
                    }}
                    onDelete={() => setDeletingTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <RecurringForm
          categories={categories}
          task={editingTask}
          onClose={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingTask(null);
            loadData();
          }}
        />
      )}

      {deletingTaskId !== null && (
        <ConfirmDialog
          title="Delete Recurring Task"
          message="Are you sure you want to delete this recurring task? It will no longer appear in new weeks."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDelete(deletingTaskId)}
          onCancel={() => setDeletingTaskId(null)}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  categoryName,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: RecurringTask;
  categoryName: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={`flex items-center gap-4 p-4 ${
        !task.isActive ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{task.title}</p>
        {categoryName && (
          <Badge variant="secondary" className="mt-1">
            {categoryName}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {task.isActive ? (
            <>
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1" />
              Resume
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
