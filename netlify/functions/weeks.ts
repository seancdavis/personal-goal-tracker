import type { Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/weeks", "").split("/").filter(Boolean);
  const weekId = pathParts[0];

  try {
    // GET /api/weeks - List all weeks
    if (req.method === "GET" && !weekId) {
      const weeks = await db.select().from(schema.weeks).orderBy(schema.weeks.id);
      return json(weeks);
    }

    // GET /api/weeks/:id - Get single week
    if (req.method === "GET" && weekId) {
      const [week] = await db
        .select()
        .from(schema.weeks)
        .where(eq(schema.weeks.id, weekId));
      if (!week) return notFound("Week not found");
      return json(week);
    }

    // POST /api/weeks - Create week
    if (req.method === "POST" && !weekId) {
      const body = await req.json();
      const { id, startDate, endDate } = body;

      if (!id || !startDate || !endDate) {
        return error("id, startDate, and endDate are required");
      }

      const [existing] = await db
        .select()
        .from(schema.weeks)
        .where(eq(schema.weeks.id, id));
      if (existing) {
        return error("Week already exists", 409);
      }

      const [week] = await db
        .insert(schema.weeks)
        .values({
          id,
          startDate,
          endDate,
          totalTasks: 0,
          completedTasks: 0,
        })
        .returning();

      return json(week, 201);
    }

    // DELETE /api/weeks/:id - Delete week
    if (req.method === "DELETE" && weekId) {
      const [deleted] = await db
        .delete(schema.weeks)
        .where(eq(schema.weeks.id, weekId))
        .returning();
      if (!deleted) return notFound("Week not found");
      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Weeks API error:", err);
    return error("Internal server error", 500);
  }
}
