import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";
import { renderMarkdown } from "./_shared/markdown.js";

export const config: Config = {
  path: [
    "/api/backlog",
    "/api/backlog/:id",
    "/api/backlog/:id/to-week",
    "/api/backlog/:backlogItemId/notes",
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

async function handleList(): Promise<Response> {
  const items = await db
    .select()
    .from(schema.backlogItems)
    .orderBy(schema.backlogItems.priority);
  return json(items);
}

async function handleGet(id: number): Promise<Response> {
  const [item] = await db
    .select()
    .from(schema.backlogItems)
    .where(eq(schema.backlogItems.id, id));
  if (!item) return notFound("Backlog item not found");
  return json(item);
}

async function handleCreate(req: Request): Promise<Response> {
  const body = await req.json();
  const { categoryId, title, contentMarkdown, priority } = body;

  if (!title) {
    return error("title is required");
  }

  const contentHtml = contentMarkdown ? await renderMarkdown(contentMarkdown) : null;

  const [item] = await db
    .insert(schema.backlogItems)
    .values({
      categoryId: categoryId || null,
      title,
      contentMarkdown: contentMarkdown || null,
      contentHtml,
      priority: priority || 0,
    })
    .returning();

  return json(item, 201);
}

async function handleUpdate(id: number, req: Request): Promise<Response> {
  const body = await req.json();
  const { categoryId, title, contentMarkdown, priority } = body;

  const contentHtml = contentMarkdown !== undefined
    ? (contentMarkdown ? await renderMarkdown(contentMarkdown) : null)
    : undefined;

  const [item] = await db
    .update(schema.backlogItems)
    .set({
      ...(categoryId !== undefined && { categoryId }),
      ...(title !== undefined && { title }),
      ...(contentMarkdown !== undefined && { contentMarkdown }),
      ...(contentHtml !== undefined && { contentHtml }),
      ...(priority !== undefined && { priority }),
      updatedAt: new Date(),
    })
    .where(eq(schema.backlogItems.id, id))
    .returning();

  if (!item) return notFound("Backlog item not found");
  return json(item);
}

async function handleMoveToWeek(id: number, req: Request): Promise<Response> {
  const body = await req.json();
  const { weekId } = body;

  if (!weekId) {
    return error("weekId is required");
  }

  const [item] = await db
    .select()
    .from(schema.backlogItems)
    .where(eq(schema.backlogItems.id, id));
  if (!item) return notFound("Backlog item not found");

  const [task] = await db
    .insert(schema.tasks)
    .values({
      weekId,
      categoryId: item.categoryId,
      title: item.title,
      contentMarkdown: item.contentMarkdown,
      contentHtml: item.contentHtml,
      stalenessCount: 0,
    })
    .returning();

  const notes = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.backlogItemId, id));

  for (const note of notes) {
    await db.insert(schema.notes).values({
      taskId: task.id,
      contentMarkdown: note.contentMarkdown,
      contentHtml: note.contentHtml,
    });
  }

  await db.delete(schema.backlogItems).where(eq(schema.backlogItems.id, id));
  await updateWeekStats(weekId);

  return json(task);
}

async function handleDelete(id: number): Promise<Response> {
  const [deleted] = await db
    .delete(schema.backlogItems)
    .where(eq(schema.backlogItems.id, id))
    .returning();
  if (!deleted) return notFound("Backlog item not found");
  return json({ success: true });
}

async function handleListNotes(backlogItemId: number): Promise<Response> {
  const notes = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.backlogItemId, backlogItemId));
  return json(notes);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id, backlogItemId } = context.params;
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const action = pathParts[pathParts.length - 1];

  try {
    // Handle /api/backlog/:backlogItemId/notes
    if (backlogItemId && action === "notes") {
      if (req.method === "GET") return handleListNotes(parseInt(backlogItemId, 10));
      return methodNotAllowed();
    }

    // Handle /api/backlog/:id/to-week
    if (id && action === "to-week") {
      if (req.method === "POST") return handleMoveToWeek(parseInt(id, 10), req);
      return methodNotAllowed();
    }

    // Handle /api/backlog and /api/backlog/:id
    if (req.method === "GET" && !id) return handleList();
    if (req.method === "GET" && id) return handleGet(parseInt(id, 10));
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "PATCH" && id) return handleUpdate(parseInt(id, 10), req);
    if (req.method === "DELETE" && id) return handleDelete(parseInt(id, 10));

    return methodNotAllowed();
  } catch (err) {
    console.error("Backlog API error:", err);
    return error("Internal server error", 500);
  }
}
