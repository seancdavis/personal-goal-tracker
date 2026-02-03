import type { Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/categories", "").split("/").filter(Boolean);
  const categoryId = pathParts[0] ? parseInt(pathParts[0], 10) : null;

  try {
    // GET /api/categories - List all categories
    if (req.method === "GET" && !categoryId) {
      const categories = await db.select().from(schema.categories);
      return json(categories);
    }

    // GET /api/categories/:id - Get single category
    if (req.method === "GET" && categoryId) {
      const [category] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, categoryId));
      if (!category) return notFound("Category not found");
      return json(category);
    }

    // POST /api/categories - Create category
    if (req.method === "POST" && !categoryId) {
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

    // PATCH /api/categories/:id - Update category
    if (req.method === "PATCH" && categoryId) {
      const body = await req.json();
      const { name, parentId } = body;

      const [category] = await db
        .update(schema.categories)
        .set({
          ...(name !== undefined && { name }),
          ...(parentId !== undefined && { parentId }),
        })
        .where(eq(schema.categories.id, categoryId))
        .returning();

      if (!category) return notFound("Category not found");
      return json(category);
    }

    // DELETE /api/categories/:id - Delete category
    if (req.method === "DELETE" && categoryId) {
      const [deleted] = await db
        .delete(schema.categories)
        .where(eq(schema.categories.id, categoryId))
        .returning();
      if (!deleted) return notFound("Category not found");
      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Categories API error:", err);
    return error("Internal server error", 500);
  }
}
