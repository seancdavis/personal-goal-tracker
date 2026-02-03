import type { Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
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
  const pathParts = url.pathname.replace("/api/backlog", "").split("/").filter(Boolean);
  const itemId = pathParts[0] ? parseInt(pathParts[0], 10) : null;
  const action = pathParts[1]; // "to-week"

  try {
    // GET /api/backlog - List all backlog items
    if (req.method === "GET" && !itemId) {
      const items = await db
        .select()
        .from(schema.backlogItems)
        .orderBy(schema.backlogItems.priority);
      return json(items);
    }

    // GET /api/backlog/:id
    if (req.method === "GET" && itemId && !action) {
      const [item] = await db
        .select()
        .from(schema.backlogItems)
        .where(eq(schema.backlogItems.id, itemId));
      if (!item) return notFound("Backlog item not found");
      return json(item);
    }

    // POST /api/backlog - Create backlog item
    if (req.method === "POST" && !itemId) {
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

    // PATCH /api/backlog/:id
    if (req.method === "PATCH" && itemId && !action) {
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
        .where(eq(schema.backlogItems.id, itemId))
        .returning();

      if (!item) return notFound("Backlog item not found");
      return json(item);
    }

    // POST /api/backlog/:id/to-week - Move to week
    if (req.method === "POST" && itemId && action === "to-week") {
      const body = await req.json();
      const { weekId } = body;

      if (!weekId) {
        return error("weekId is required");
      }

      const [item] = await db
        .select()
        .from(schema.backlogItems)
        .where(eq(schema.backlogItems.id, itemId));
      if (!item) return notFound("Backlog item not found");

      // Create task
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

      // Copy notes
      const notes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.backlogItemId, itemId));

      for (const note of notes) {
        await db.insert(schema.notes).values({
          taskId: task.id,
          contentMarkdown: note.contentMarkdown,
          contentHtml: note.contentHtml,
        });
      }

      // Delete backlog item
      await db.delete(schema.backlogItems).where(eq(schema.backlogItems.id, itemId));
      await updateWeekStats(weekId);

      return json(task);
    }

    // DELETE /api/backlog/:id
    if (req.method === "DELETE" && itemId) {
      const [deleted] = await db
        .delete(schema.backlogItems)
        .where(eq(schema.backlogItems.id, itemId))
        .returning();
      if (!deleted) return notFound("Backlog item not found");
      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Backlog API error:", err);
    return error("Internal server error", 500);
  }
}
