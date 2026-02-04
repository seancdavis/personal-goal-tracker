import { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { weeksApi, tasksApi } from "@/lib/api";
import {
  formatWeekRange,
  getNextWeekId,
  getPreviousWeekId,
} from "@/lib/dates";
import type { TaskWithCategory, Category } from "@/types";
import { useAsyncData } from "@/hooks";
import { useCategories } from "@/contexts/CategoriesContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AsyncSection } from "@/components/ui/AsyncSection";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { ScoreIndicator } from "@/components/weeks/ScoreIndicator";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";

interface GroupedTasks {
  categoryId: number | null;
  category: Category | null;
  tasks: TaskWithCategory[];
}

function WeekHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded" />
        <div>
          <Skeleton className="h-7 w-48 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-8 h-8 rounded" />
      </div>
      <Skeleton className="w-16 h-16 rounded-full" />
    </div>
  );
}

function TasksListSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeekView() {
  const { weekId } = useParams<{ weekId: string }>();
  const categories = useCategories();
  const [showTaskForm, setShowTaskForm] = useState(false);

  const fetchWeek = useCallback(
    () => weeksApi.get(weekId!),
    [weekId]
  );
  const fetchTasks = useCallback(
    () => tasksApi.listByWeek(weekId!),
    [weekId]
  );

  const week = useAsyncData(fetchWeek, { deps: [weekId] });
  const tasks = useAsyncData(fetchTasks, { deps: [weekId] });

  const groupedTasks = useMemo((): GroupedTasks[] => {
    if (!tasks.data) return [];

    const groups = new Map<number | null, GroupedTasks>();
    groups.set(null, { categoryId: null, category: null, tasks: [] });

    for (const task of tasks.data) {
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

    return Array.from(groups.values())
      .filter((g) => g.tasks.length > 0)
      .sort((a, b) => {
        if (a.category === null) return 1;
        if (b.category === null) return -1;
        return a.category.name.localeCompare(b.category.name);
      });
  }, [tasks.data]);

  async function handleToggleTask(taskId: number) {
    try {
      const updatedTask = await tasksApi.toggleStatus(taskId);
      // Optimistic update for tasks
      tasks.setData((prev) =>
        prev ? prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)) : prev
      );
      // Refresh week stats
      const updatedWeek = await weeksApi.get(weekId!);
      week.setData(updatedWeek);
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  }

  async function handleTaskCreated() {
    setShowTaskForm(false);
    // Only refresh tasks section
    tasks.refetch();
    // Also refresh week stats
    week.refetch();
  }

  // Header renders with navigation even while loading
  return (
    <div className="space-y-6">
      {/* Week Header */}
      <AsyncSection
        data={week.data}
        loading={week.loading}
        error={week.error}
        onRetry={week.refetch}
        loadingElement={<WeekHeaderSkeleton />}
        errorElement={
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{week.error || "Week not found"}</p>
            <Link to="/">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        }
      >
        {(weekData) => (
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
              completed={weekData.completedTasks}
              total={weekData.totalTasks}
              size="lg"
            />
          </div>
        )}
      </AsyncSection>

      {/* Add Task Button - renders immediately */}
      <div className="flex justify-end">
        <Button onClick={() => setShowTaskForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && categories.data && (
        <TaskForm
          weekId={weekId!}
          categories={categories.data}
          onClose={() => setShowTaskForm(false)}
          onSaved={handleTaskCreated}
        />
      )}

      {/* Tasks by Category */}
      <AsyncSection
        data={tasks.data}
        loading={tasks.loading}
        error={tasks.error}
        onRetry={tasks.refetch}
        loadingElement={<TasksListSkeleton />}
        emptyElement={
          <Card className="text-center py-12">
            <p className="text-gray-600 mb-4">No tasks yet for this week.</p>
            <Button onClick={() => setShowTaskForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Task
            </Button>
          </Card>
        }
      >
        {() => (
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
      </AsyncSection>
    </div>
  );
}
