import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";
import { renderMarkdown } from "./_shared/markdown.js";

export const config: Config = {
  path: ["/api/follow-ups", "/api/follow-ups/:id"],
};

async function handleList(): Promise<Response> {
  const followUps = await db
    .select({
      id: schema.followUps.id,
      sourceTaskId: schema.followUps.sourceTaskId,
      categoryId: schema.followUps.categoryId,
      title: schema.followUps.title,
      contentMarkdown: schema.followUps.contentMarkdown,
      contentHtml: schema.followUps.contentHtml,
      createdAt: schema.followUps.createdAt,
      category: schema.categories,
    })
    .from(schema.followUps)
    .leftJoin(schema.categories, eq(schema.followUps.categoryId, schema.categories.id));
  return json(followUps);
}

async function handleCreate(req: Request): Promise<Response> {
  const body = await req.json();
  const { sourceTaskId, categoryId, title, contentMarkdown } = body;

  if (!sourceTaskId || !title) {
    return error("sourceTaskId and title are required");
  }

  const contentHtml = contentMarkdown ? await renderMarkdown(contentMarkdown) : null;

  const [followUp] = await db
    .insert(schema.followUps)
    .values({
      sourceTaskId,
      categoryId: categoryId || null,
      title,
      contentMarkdown: contentMarkdown || null,
      contentHtml,
    })
    .returning();

  return json(followUp, 201);
}

async function handleDelete(id: number): Promise<Response> {
  const [deleted] = await db
    .delete(schema.followUps)
    .where(eq(schema.followUps.id, id))
    .returning();
  if (!deleted) return notFound("Follow-up not found");
  return json({ success: true });
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id } = context.params;

  try {
    if (req.method === "GET" && !id) return handleList();
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "DELETE" && id) return handleDelete(parseInt(id, 10));

    return methodNotAllowed();
  } catch (err) {
    console.error("Follow-ups API error:", err);
    return error("Internal server error", 500);
  }
}
