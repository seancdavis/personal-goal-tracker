import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";

export const config: Config = {
  path: ["/api/weeks", "/api/weeks/:id", "/api/weeks/:weekId/tasks"],
};

async function handleList(): Promise<Response> {
  const weeks = await db.select().from(schema.weeks).orderBy(schema.weeks.id);
  return json(weeks);
}

async function handleGet(id: string): Promise<Response> {
  const [week] = await db
    .select()
    .from(schema.weeks)
    .where(eq(schema.weeks.id, id));
  if (!week) return notFound("Week not found");
  return json(week);
}

async function handleCreate(req: Request): Promise<Response> {
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

async function handleDelete(id: string): Promise<Response> {
  const [deleted] = await db
    .delete(schema.weeks)
    .where(eq(schema.weeks.id, id))
    .returning();
  if (!deleted) return notFound("Week not found");
  return json({ success: true });
}

async function handleListTasks(weekId: string): Promise<Response> {
  const tasks = await db
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
    .where(eq(schema.tasks.weekId, weekId));

  return json(tasks);
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id, weekId } = context.params;
  const url = new URL(req.url);
  const isTasksRoute = url.pathname.endsWith("/tasks");

  try {
    if (isTasksRoute && weekId) {
      if (req.method === "GET") return handleListTasks(weekId);
      return methodNotAllowed();
    }

    if (req.method === "GET" && !id) return handleList();
    if (req.method === "GET" && id) return handleGet(id);
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "DELETE" && id) return handleDelete(id);

    return methodNotAllowed();
  } catch (err) {
    console.error("Weeks API error:", err);
    return error("Internal server error", 500);
  }
}
