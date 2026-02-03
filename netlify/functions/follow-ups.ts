import type { Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";
import { renderMarkdown } from "./_shared/markdown";

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/follow-ups", "").split("/").filter(Boolean);
  const followUpId = pathParts[0] ? parseInt(pathParts[0], 10) : null;

  try {
    // GET /api/follow-ups - List all follow-ups
    if (req.method === "GET" && !followUpId) {
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

    // POST /api/follow-ups - Create follow-up
    if (req.method === "POST" && !followUpId) {
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

    // DELETE /api/follow-ups/:id
    if (req.method === "DELETE" && followUpId) {
      const [deleted] = await db
        .delete(schema.followUps)
        .where(eq(schema.followUps.id, followUpId))
        .returning();
      if (!deleted) return notFound("Follow-up not found");
      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Follow-ups API error:", err);
    return error("Internal server error", 500);
  }
}
