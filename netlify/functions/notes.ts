import type { Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";
import { renderMarkdown } from "./_shared/markdown";

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/notes", "").split("/").filter(Boolean);
  const noteId = pathParts[0] ? parseInt(pathParts[0], 10) : null;

  try {
    // GET /api/notes?taskId=X or ?backlogItemId=X
    if (req.method === "GET" && !noteId) {
      const taskId = url.searchParams.get("taskId");
      const backlogItemId = url.searchParams.get("backlogItemId");

      if (taskId) {
        const notes = await db
          .select()
          .from(schema.notes)
          .where(eq(schema.notes.taskId, parseInt(taskId, 10)));
        return json(notes);
      }

      if (backlogItemId) {
        const notes = await db
          .select()
          .from(schema.notes)
          .where(eq(schema.notes.backlogItemId, parseInt(backlogItemId, 10)));
        return json(notes);
      }

      return error("taskId or backlogItemId query parameter is required");
    }

    // GET /api/notes/:id
    if (req.method === "GET" && noteId) {
      const [note] = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.id, noteId));
      if (!note) return notFound("Note not found");
      return json(note);
    }

    // POST /api/notes
    if (req.method === "POST" && !noteId) {
      const body = await req.json();
      const { taskId, backlogItemId, contentMarkdown } = body;

      if (!contentMarkdown) {
        return error("contentMarkdown is required");
      }

      if (!taskId && !backlogItemId) {
        return error("taskId or backlogItemId is required");
      }

      const contentHtml = await renderMarkdown(contentMarkdown);

      const [note] = await db
        .insert(schema.notes)
        .values({
          taskId: taskId || null,
          backlogItemId: backlogItemId || null,
          contentMarkdown,
          contentHtml,
        })
        .returning();

      return json(note, 201);
    }

    // PATCH /api/notes/:id
    if (req.method === "PATCH" && noteId) {
      const body = await req.json();
      const { contentMarkdown } = body;

      const contentHtml = contentMarkdown
        ? await renderMarkdown(contentMarkdown)
        : undefined;

      const [note] = await db
        .update(schema.notes)
        .set({
          ...(contentMarkdown !== undefined && { contentMarkdown }),
          ...(contentHtml !== undefined && { contentHtml }),
          updatedAt: new Date(),
        })
        .where(eq(schema.notes.id, noteId))
        .returning();

      if (!note) return notFound("Note not found");
      return json(note);
    }

    // DELETE /api/notes/:id
    if (req.method === "DELETE" && noteId) {
      const [deleted] = await db
        .delete(schema.notes)
        .where(eq(schema.notes.id, noteId))
        .returning();
      if (!deleted) return notFound("Note not found");
      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Notes API error:", err);
    return error("Internal server error", 500);
  }
}
