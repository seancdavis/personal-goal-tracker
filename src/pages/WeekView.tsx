import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { weeksApi, tasksApi, categoriesApi } from "@/lib/api";
import {
  formatWeekRange,
  getNextWeekId,
  getPreviousWeekId,
} from "@/lib/dates";
import type { Week, TaskWithCategory, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ScoreIndicator } from "@/components/weeks/ScoreIndicator";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";

interface GroupedTasks {
  categoryId: number | null;
  category: Category | null;
  tasks: TaskWithCategory[];
}

export function WeekView() {
  const { weekId } = useParams<{ weekId: string }>();
  const [week, setWeek] = useState<Week | null>(null);
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    if (weekId) {
      loadData();
    }
  }, [weekId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [weekData, tasksData, categoriesData] = await Promise.all([
        weeksApi.get(weekId!),
        tasksApi.listByWeek(weekId!),
        categoriesApi.list(),
      ]);
      setWeek(weekData);
      setTasks(tasksData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week");
    } finally {
      setLoading(false);
    }
  }

  const groupedTasks = useMemo((): GroupedTasks[] => {
    const groups = new Map<number | null, GroupedTasks>();

    // Initialize with "uncategorized" group
    groups.set(null, { categoryId: null, category: null, tasks: [] });

    // Group tasks by category
    for (const task of tasks) {
      const key = task.categoryId;
      if (!groups.has(key)) {
        groups.set(key, {
          categoryId: key,
          category: task.category,
          tasks: [],
        });
      }
      groups.get(key)!.tasks.push(task);
    }

    // Sort groups: categories first (alphabetically), then uncategorized
    return Array.from(groups.values())
      .filter((g) => g.tasks.length > 0)
      .sort((a, b) => {
        if (a.category === null) return 1;
        if (b.category === null) return -1;
        return a.category.name.localeCompare(b.category.name);
      });
  }, [tasks]);

  async function handleToggleTask(taskId: number) {
    try {
      const updatedTask = await tasksApi.toggleStatus(taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
      );
      // Refresh week stats
      const updatedWeek = await weeksApi.get(weekId!);
      setWeek(updatedWeek);
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  }

  async function handleTaskCreated() {
    setShowTaskForm(false);
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !week) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Week not found"}</p>
        <Link to="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/weeks/${getPreviousWeekId(weekId!)}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{formatWeekRange(weekId!)}</h1>
            <p className="text-sm text-gray-500">Week {weekId}</p>
          </div>
          <Link to={`/weeks/${getNextWeekId(weekId!)}`}>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <ScoreIndicator
          completed={week.completedTasks}
          total={week.totalTasks}
          size="lg"
        />
      </div>

      {/* Add Task Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowTaskForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          weekId={weekId!}
          categories={categories}
          onClose={() => setShowTaskForm(false)}
          onSaved={handleTaskCreated}
        />
      )}

      {/* Tasks by Category */}
      {groupedTasks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600 mb-4">No tasks yet for this week.</p>
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Task
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedTasks.map((group) => (
            <div key={group.categoryId ?? "uncategorized"}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {group.category?.name ?? "Uncategorized"}
              </h2>
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    weekId={weekId!}
                    onToggle={() => handleToggleTask(task.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
