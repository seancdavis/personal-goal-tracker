import type { Context } from "@netlify/functions";
import { eq, and } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";
import { renderMarkdown } from "./_shared/markdown";

async function updateWeekStats(weekId: string) {
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.weekId, weekId));

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  await db
    .update(schema.weeks)
    .set({ totalTasks, completedTasks, updatedAt: new Date() })
    .where(eq(schema.weeks.id, weekId));
}

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/tasks", "").split("/").filter(Boolean);
  const taskId = pathParts[0] ? parseInt(pathParts[0], 10) : null;
  const action = pathParts[1]; // "toggle" or "to-backlog"

  try {
    // GET /api/tasks?weekId=XXXX - List tasks by week
    if (req.method === "GET" && !taskId) {
      const weekId = url.searchParams.get("weekId");
      if (!weekId) return error("weekId query parameter is required");

      const tasks = await db
        .select({
          id: schema.tasks.id,
          weekId: schema.tasks.weekId,
          categoryId: schema.tasks.categoryId,
          title: schema.tasks.title,
          contentMarkdown: schema.tasks.contentMarkdown,
          contentHtml: schema.tasks.contentHtml,
          status: schema.tasks.status,
          isRecurring: schema.tasks.isRecurring,
          stalenessCount: schema.tasks.stalenessCount,
          previousVersionId: schema.tasks.previousVersionId,
          createdAt: schema.tasks.createdAt,
          updatedAt: schema.tasks.updatedAt,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(schema.categories, eq(schema.tasks.categoryId, schema.categories.id))
        .where(eq(schema.tasks.weekId, weekId));

      return json(tasks);
    }

    // GET /api/tasks/:id - Get single task
    if (req.method === "GET" && taskId && !action) {
      const [task] = await db
        .select({
          id: schema.tasks.id,
          weekId: schema.tasks.weekId,
          categoryId: schema.tasks.categoryId,
          title: schema.tasks.title,
          contentMarkdown: schema.tasks.contentMarkdown,
          contentHtml: schema.tasks.contentHtml,
          status: schema.tasks.status,
          isRecurring: schema.tasks.isRecurring,
          stalenessCount: schema.tasks.stalenessCount,
          previousVersionId: schema.tasks.previousVersionId,
          createdAt: schema.tasks.createdAt,
          updatedAt: schema.tasks.updatedAt,
          category: schema.categories,
        })
        .from(schema.tasks)
        .leftJoin(schema.categories, eq(schema.tasks.categoryId, schema.categories.id))
        .where(eq(schema.tasks.id, taskId));

      if (!task) return notFound("Task not found");
      return json(task);
    }

    // POST /api/tasks - Create task
    if (req.method === "POST" && !taskId) {
      const body = await req.json();
      const { weekId, categoryId, title, contentMarkdown, isRecurring, stalenessCount, previousVersionId } = body;

      if (!weekId || !title) {
        return error("weekId and title are required");
      }

      const contentHtml = contentMarkdown ? await renderMarkdown(contentMarkdown) : null;

      const [task] = await db
        .insert(schema.tasks)
        .values({
          weekId,
          categoryId: categoryId || null,
          title,
          contentMarkdown: contentMarkdown || null,
          contentHtml,
          isRecurring: isRecurring || false,
          stalenessCount: stalenessCount || 0,
          previousVersionId: previousVersionId || null,
        })
        .returning();

      await updateWeekStats(weekId);
      return json(task, 201);
    }

    // PATCH /api/tasks/:id - Update task
    if (req.method === "PATCH" && taskId && !action) {
      const body = await req.json();
      const { categoryId, title, contentMarkdown, status } = body;

      const [existing] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId));
      if (!existing) return notFound("Task not found");

      const contentHtml = contentMarkdown !== undefined
        ? (contentMarkdown ? await renderMarkdown(contentMarkdown) : null)
        : undefined;

      const [task] = await db
        .update(schema.tasks)
        .set({
          ...(categoryId !== undefined && { categoryId }),
          ...(title !== undefined && { title }),
          ...(contentMarkdown !== undefined && { contentMarkdown }),
          ...(contentHtml !== undefined && { contentHtml }),
          ...(status !== undefined && { status }),
          updatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, taskId))
        .returning();

      if (status !== undefined) {
        await updateWeekStats(existing.weekId);
      }

      return json(task);
    }

    // POST /api/tasks/:id/toggle - Toggle task status
    if (req.method === "POST" && taskId && action === "toggle") {
      const [existing] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId));
      if (!existing) return notFound("Task not found");

      const newStatus = existing.status === "completed" ? "pending" : "completed";

      const [task] = await db
        .update(schema.tasks)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(schema.tasks.id, taskId))
        .returning();

      await updateWeekStats(existing.weekId);
      return json(task);
    }

    // POST /api/tasks/:id/to-backlog - Move task to backlog
    if (req.method === "POST" && taskId && action === "to-backlog") {
      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId));
      if (!task) return notFound("Task not found");

      // Create backlog item
      const [backlogItem] = await db
        .insert(schema.backlogItems)
        .values({
          categoryId: task.categoryId,
          title: task.title,
          contentMarkdown: task.contentMarkdown,
          contentHtml: task.contentHtml,
          priority: 0,
        })
        .returning();

      // Copy notes to backlog item
      const notes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.taskId, taskId));

      for (const note of notes) {
        await db.insert(schema.notes).values({
          backlogItemId: backlogItem.id,
          contentMarkdown: note.contentMarkdown,
          contentHtml: note.contentHtml,
        });
      }

      // Delete task
      await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
      await updateWeekStats(task.weekId);

      return json(backlogItem);
    }

    // DELETE /api/tasks/:id - Delete task
    if (req.method === "DELETE" && taskId) {
      const [task] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, taskId));
      if (!task) return notFound("Task not found");

      await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
      await updateWeekStats(task.weekId);

      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Tasks API error:", err);
    return error("Internal server error", 500);
  }
}
