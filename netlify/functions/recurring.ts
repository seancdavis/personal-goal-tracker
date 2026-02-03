import type { Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";
import { renderMarkdown } from "./_shared/markdown";

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/recurring", "").split("/").filter(Boolean);
  const taskId = pathParts[0] ? parseInt(pathParts[0], 10) : null;
  const action = pathParts[1]; // "toggle"

  try {
    // GET /api/recurring - List all recurring tasks
    if (req.method === "GET" && !taskId) {
      const tasks = await db.select().from(schema.recurringTasks);
      return json(tasks);
    }

    // GET /api/recurring/:id - Get single recurring task
    if (req.method === "GET" && taskId && !action) {
      const [task] = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, taskId));
      if (!task) return notFound("Recurring task not found");
      return json(task);
    }

    // POST /api/recurring - Create recurring task
    if (req.method === "POST" && !taskId) {
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

    // PATCH /api/recurring/:id - Update recurring task
    if (req.method === "PATCH" && taskId && !action) {
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
        .where(eq(schema.recurringTasks.id, taskId))
        .returning();

      if (!task) return notFound("Recurring task not found");
      return json(task);
    }

    // POST /api/recurring/:id/toggle - Toggle active status
    if (req.method === "POST" && taskId && action === "toggle") {
      const [existing] = await db
        .select()
        .from(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, taskId));
      if (!existing) return notFound("Recurring task not found");

      const [task] = await db
        .update(schema.recurringTasks)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(schema.recurringTasks.id, taskId))
        .returning();

      return json(task);
    }

    // DELETE /api/recurring/:id - Delete recurring task
    if (req.method === "DELETE" && taskId) {
      const [deleted] = await db
        .delete(schema.recurringTasks)
        .where(eq(schema.recurringTasks.id, taskId))
        .returning();
      if (!deleted) return notFound("Recurring task not found");
      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Recurring API error:", err);
    return error("Internal server error", 500);
  }
}
