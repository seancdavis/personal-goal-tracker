import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db";
import { json, error, notFound, methodNotAllowed } from "./_shared/response";

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace("/api/attachments", "").split("/").filter(Boolean);
  const firstPart = pathParts[0];
  const secondPart = pathParts[1];

  try {
    // GET /api/attachments?noteId=X - List attachments by note
    if (req.method === "GET" && !firstPart) {
      const noteId = url.searchParams.get("noteId");
      if (!noteId) return error("noteId query parameter is required");

      const attachments = await db
        .select()
        .from(schema.attachments)
        .where(eq(schema.attachments.noteId, parseInt(noteId, 10)));

      return json(attachments);
    }

    // GET /api/attachments/blob/:blobKey - Get blob content
    if (req.method === "GET" && firstPart === "blob" && secondPart) {
      // Reconstruct the full blob key from the remaining path
      const blobKey = pathParts.slice(1).join("/");

      const store = getStore("attachments");
      const blob = await store.get(blobKey, { type: "arrayBuffer" });

      if (!blob) {
        return notFound("Attachment not found");
      }

      // Get metadata for content type
      const metadata = await store.getMetadata(blobKey);
      const mimeType = metadata?.metadata?.mimeType || "application/octet-stream";

      return new Response(blob, {
        headers: {
          "Content-Type": mimeType,
        },
      });
    }

    // DELETE /api/attachments/:id - Delete attachment
    if (req.method === "DELETE" && firstPart && firstPart !== "blob") {
      const attachmentId = parseInt(firstPart, 10);

      const [attachment] = await db
        .select()
        .from(schema.attachments)
        .where(eq(schema.attachments.id, attachmentId));

      if (!attachment) {
        return notFound("Attachment not found");
      }

      // Delete from blob store
      const store = getStore("attachments");
      await store.delete(attachment.blobKey);

      // Delete from database
      await db.delete(schema.attachments).where(eq(schema.attachments.id, attachmentId));

      return json({ success: true });
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Attachments API error:", err);
    return error("Internal server error", 500);
  }
}
