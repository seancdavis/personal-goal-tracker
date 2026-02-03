import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db, schema } from "./_shared/db.js";
import { json, error, notFound, methodNotAllowed } from "./_shared/response.js";

export const config: Config = {
  path: ["/api/attachments/:id", "/api/attachments/blob/*"],
};

async function handleDelete(id: number): Promise<Response> {
  const [attachment] = await db
    .select()
    .from(schema.attachments)
    .where(eq(schema.attachments.id, id));

  if (!attachment) {
    return notFound("Attachment not found");
  }

  const store = getStore("attachments");
  await store.delete(attachment.blobKey);

  await db.delete(schema.attachments).where(eq(schema.attachments.id, id));

  return json({ success: true });
}

async function handleGetBlob(blobPath: string): Promise<Response> {
  const store = getStore("attachments");
  const blob = await store.get(blobPath, { type: "arrayBuffer" });

  if (!blob) {
    return notFound("Attachment not found");
  }

  const metadata = await store.getMetadata(blobPath);
  const mimeType = metadata?.metadata?.mimeType || "application/octet-stream";

  return new Response(blob, {
    headers: {
      "Content-Type": mimeType,
    },
  });
}

export default async function handler(req: Request, context: Context): Promise<Response> {
  const { id } = context.params;
  const url = new URL(req.url);
  const isBlobRoute = url.pathname.includes("/blob/");

  try {
    if (isBlobRoute && req.method === "GET") {
      const blobPath = url.pathname.replace("/api/attachments/blob/", "");
      return handleGetBlob(blobPath);
    }

    if (id && req.method === "DELETE") {
      return handleDelete(parseInt(id, 10));
    }

    return methodNotAllowed();
  } catch (err) {
    console.error("Attachments API error:", err);
    return error("Internal server error", 500);
  }
}
