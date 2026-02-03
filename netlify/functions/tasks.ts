import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";
import { renderMarkdown } from "./_shared/markdown.js";

export const config: Config = {
  path: [
    "/api/tasks",
    "/api/tasks/:id",
    "/api/tasks/:id/toggle",
    "/api/tasks/:id/to-backlog",
    "/api/tasks/:taskId/notes",
  ],
};

async function updateWeekStats(weekId: string): Promise<void> {
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

async function handleGet(id: number): Promise<Response> {
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
    .where(eq(schema.tasks.id, id));

  if (!task) return notFound("Task not found");
  return json(task);
}

async function handleCreate(req: Request): Promise<Response> {
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

async function handleUpdate(id: number, req: Request): Promise<Response> {
  const body = await req.json();
  const { categoryId, title, contentMarkdown, status } = body;

  const [existing] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));
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
    .where(eq(schema.tasks.id, id))
    .returning();

  if (status !== undefined) {
    await updateWeekStats(existing.weekId);
  }

  return json(task);
}

async function handleToggle(id: number): Promise<Response> {
  const [existing] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));
  if (!existing) return notFound("Task not found");

  const newStatus = existing.status === "completed" ? "pending" : "completed";

  const [task] = await db
    .update(schema.tasks)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.tasks.id, id))
    .returning();

  await updateWeekStats(existing.weekId);
  return json(task);
}

async function handleMoveToBacklog(id: number): Promise<Response> {
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));
  if (!task) return notFound("Task not found");

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

  const notes = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.taskId, id));

  for (const note of notes) {
    await db.insert(schema.notes).values({
      backlogItemId: backlogItem.id,
      contentMarkdown: note.contentMarkdown,
      contentHtml: note.contentHtml,
    });
  }

  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  await updateWeekStats(task.weekId);

  return json(backlogItem);
}

async function handleDelete(id: number): Promise<Response> {
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));
  if (!task) return notFound("Task not found");

  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  await updateWeekStats(task.weekId);

  return json({ success: true });
}

async function handleListNotes(taskId: number): Promise<Response> {
  const notes = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.taskId, taskId));
  return json(notes);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id, taskId } = context.params;
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  try {
    // Handle /api/tasks/:taskId/notes
    if (taskId && action === "notes") {
      if (req.method === "GET") return handleListNotes(parseInt(taskId, 10));
      return methodNotAllowed();
    }

    // Handle /api/tasks/:id/toggle
    if (id && action === "toggle") {
      if (req.method === "POST") return handleToggle(parseInt(id, 10));
      return methodNotAllowed();
    }

    // Handle /api/tasks/:id/to-backlog
    if (id && action === "to-backlog") {
      if (req.method === "POST") return handleMoveToBacklog(parseInt(id, 10));
      return methodNotAllowed();
    }

    // Handle /api/tasks and /api/tasks/:id
    if (req.method === "GET" && id) return handleGet(parseInt(id, 10));
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "PATCH" && id) return handleUpdate(parseInt(id, 10), req);
    if (req.method === "DELETE" && id) return handleDelete(parseInt(id, 10));

    return methodNotAllowed();
  } catch (err) {
    console.error("Tasks API error:", err);
    return error("Internal server error", 500);
  }
}
