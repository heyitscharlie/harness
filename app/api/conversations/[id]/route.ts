import { z } from "zod";
import { deleteConversation, updateConversation } from "@/lib/history";

const UpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    rating: z.union([z.literal(1), z.literal(-1), z.null()]).optional(), // null clears it
    notes: z.string().max(5000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

/** Rename a conversation and/or save its evaluation (overall rating, notes). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/conversations/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Invalid id" }, { status: 400 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const updated = await updateConversation(id, parsed.data);
  if (!updated) return Response.json({ error: "Conversation not found" }, { status: 404 });
  return Response.json({ ok: true });
}

/** Delete a conversation and its turns. Memories it created are kept, unlinked. */
export async function DELETE(_request: Request, { params }: RouteContext<"/api/conversations/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Invalid id" }, { status: 400 });
  const deleted = await deleteConversation(id);
  if (!deleted) return Response.json({ error: "Conversation not found" }, { status: 404 });
  return Response.json({ ok: true });
}
