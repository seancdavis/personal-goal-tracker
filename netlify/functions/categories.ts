import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";

export const config: Config = {
  path: ["/api/categories", "/api/categories/:id"],
};

async function handleList(): Promise<Response> {
  const categories = await db.select().from(schema.categories);
  return json(categories);
}

async function handleGet(id: number): Promise<Response> {
  const [category] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.id, id));
  if (!category) return notFound("Category not found");
  return json(category);
}

async function handleCreate(req: Request): Promise<Response> {
  const body = await req.json();
  const { name, parentId } = body;

  if (!name) {
    return error("name is required");
  }

  const [category] = await db
    .insert(schema.categories)
    .values({
      name,
      parentId: parentId || null,
    })
    .returning();

  return json(category, 201);
}

async function handleUpdate(id: number, req: Request): Promise<Response> {
  const body = await req.json();
  const { name, parentId } = body;

  const [category] = await db
    .update(schema.categories)
    .set({
      ...(name !== undefined && { name }),
      ...(parentId !== undefined && { parentId }),
    })
    .where(eq(schema.categories.id, id))
    .returning();

  if (!category) return notFound("Category not found");
  return json(category);
}

async function handleDelete(id: number): Promise<Response> {
  const [deleted] = await db
    .delete(schema.categories)
    .where(eq(schema.categories.id, id))
    .returning();
  if (!deleted) return notFound("Category not found");
  return json({ success: true });
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id } = context.params;

  try {
    if (req.method === "GET" && !id) return handleList();
    if (req.method === "GET" && id) return handleGet(parseInt(id, 10));
    if (req.method === "POST" && !id) return handleCreate(req);
    if (req.method === "PATCH" && id) return handleUpdate(parseInt(id, 10), req);
    if (req.method === "DELETE" && id) return handleDelete(parseInt(id, 10));

    return methodNotAllowed();
  } catch (err) {
    console.error("Categories API error:", err);
    return error("Internal server error", 500);
  }
}
