import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";
import { renderMarkdown } from "./_shared/markdown.js";

export const config: Config = {
  path: ["/api/notes", "/api/notes/:id", "/api/notes/:noteId/attachments"],
};

async function handleGet(id: number): Promise<Response> {
  const [note] = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.id, id));
  if (!note) return notFound("Note not found");
  return json(note);
}

async function handleCreate(req: Request): Promise<Response> {
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

async function handleUpdate(id: number, req: Request): Promise<Response> {
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
    .where(eq(schema.notes.id, id))
    .returning();

  if (!note) return notFound("Note not found");
  return json(note);
}

async function handleDelete(id: number): Promise<Response> {
  const [deleted] = await db
    .delete(schema.notes)
    .where(eq(schema.notes.id, id))
    .returning();
  if (!deleted) return notFound("Note not found");
  return json({ success: true });
}

async function handleListAttachments(noteId: number): Promise<Response> {
  const attachments = await db
    .select()
    .from(schema.attachments)
    .where(eq(schema.attachments.noteId, noteId));
  return json(attachments);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id, noteId } = context.params;
  const url = new URL(req.url);
  const isAttachmentsRoute = url.pathname.endsWith("/attachments");

  try {
    // Handle /api/notes/:noteId/attachments
    if (isAttachmentsRoute && noteId) {
      if (req.method === "GET") return handleListAttachments(parseInt(noteId, 10));
      return methodNotAllowed();
    }

    // Handle /api/notes and /api/notes/:id
    if (req.method === "GET" && id) return handleGet(parseInt(id, 10));
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "PATCH" && id) return handleUpdate(parseInt(id, 10), req);
    if (req.method === "DELETE" && id) return handleDelete(parseInt(id, 10));

    return methodNotAllowed();
  } catch (err) {
    console.error("Notes API error:", err);
    return error("Internal server error", 500);
  }
}
