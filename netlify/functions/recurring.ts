import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";
import { renderMarkdown } from "./_shared/markdown.js";

export const config: Config = {
  path: ["/api/recurring", "/api/recurring/:id", "/api/recurring/:id/toggle"],
};

async function handleList(): Promise<Response> {
  const tasks = await db.select().from(schema.recurringTasks);
  return json(tasks);
}

async function handleGet(id: number): Promise<Response> {
  const [task] = await db
    .select()
    .from(schema.recurringTasks)
    .where(eq(schema.recurringTasks.id, id));
  if (!task) return notFound("Recurring task not found");
  return json(task);
}

async function handleCreate(req: Request): Promise<Response> {
  const body = await req.json();
  const { categoryId, title, contentMarkdown, isActive } = body;

  if (!title) {
    return error("title is required");
  }

  const contentHtml = contentMarkdown ? await renderMarkdown(contentMarkdown) : null;

  const [task] = await db
    .insert(schema.recurringTasks)
    .values({
      categoryId: categoryId || null,
      title,
      contentMarkdown: contentMarkdown || null,
      contentHtml,
      isActive: isActive !== false,
    })
    .returning();

  return json(task, 201);
}

async function handleUpdate(id: number, req: Request): Promise<Response> {
  const body = await req.json();
  const { categoryId, title, contentMarkdown, isActive } = body;

  const contentHtml = contentMarkdown !== undefined
    ? (contentMarkdown ? await renderMarkdown(contentMarkdown) : null)
    : undefined;

  const [task] = await db
    .update(schema.recurringTasks)
    .set({
      ...(categoryId !== undefined && { categoryId }),
      ...(title !== undefined && { title }),
      ...(contentMarkdown !== undefined && { contentMarkdown }),
      ...(contentHtml !== undefined && { contentHtml }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(eq(schema.recurringTasks.id, id))
    .returning();

  if (!task) return notFound("Recurring task not found");
  return json(task);
}

async function handleToggle(id: number): Promise<Response> {
  const [existing] = await db
    .select()
    .from(schema.recurringTasks)
    .where(eq(schema.recurringTasks.id, id));
  if (!existing) return notFound("Recurring task not found");

  const [task] = await db
    .update(schema.recurringTasks)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(schema.recurringTasks.id, id))
    .returning();

  return json(task);
}

async function handleDelete(id: number): Promise<Response> {
  const [deleted] = await db
    .delete(schema.recurringTasks)
    .where(eq(schema.recurringTasks.id, id))
    .returning();
  if (!deleted) return notFound("Recurring task not found");
  return json({ success: true });
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id } = context.params;
  const url = new URL(req.url);
  const isToggle = url.pathname.endsWith("/toggle");

  try {
    if (isToggle && id) {
      if (req.method === "POST") return handleToggle(parseInt(id, 10));
      return methodNotAllowed();
    }

    if (req.method === "GET" && !id) return handleList();
    if (req.method === "GET" && id) return handleGet(parseInt(id, 10));
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "PATCH" && id) return handleUpdate(parseInt(id, 10), req);
    if (req.method === "DELETE" && id) return handleDelete(parseInt(id, 10));

    return methodNotAllowed();
  } catch (err) {
    console.error("Recurring API error:", err);
    return error("Internal server error", 500);
  }
}
