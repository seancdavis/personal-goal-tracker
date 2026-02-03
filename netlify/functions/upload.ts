import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, methodNotAllowed } from "./_shared/response";

export default async function handler(req: Request, context: Context) {
  try {
    // POST /api/upload - Upload file
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const noteId = formData.get("noteId") as string | null;

      if (!file) {
        return error("file is required");
      }

      if (!noteId) {
        return error("noteId is required");
      }

      // Verify note exists
      const [note] = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.id, parseInt(noteId, 10)));
      if (!note) {
        return error("Note not found", 404);
      }

      // Generate unique blob key
      const timestamp = Date.now();
      const blobKey = `attachments/${noteId}/${timestamp}-${file.name}`;

      // Store in Netlify Blobs
      const store = getStore("attachments");
      const arrayBuffer = await file.arrayBuffer();
      await store.set(blobKey, new Uint8Array(arrayBuffer), {
        metadata: {
          filename: file.name,
          mimeType: file.type,
          size: file.size.toString(),
        },
      });

      // Create attachment record
      const [attachment] = await db
        .insert(schema.attachments)
        .values({
          noteId: parseInt(noteId, 10),
          filename: file.name,
          blobKey,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        })
        .returning();

      return json(attachment, 201);
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Upload API error:", err);
    return error("Internal server error", 500);
  }
}
