import { z } from "zod";
import { updateEvaluation } from "@/lib/history";

const EvaluationSchema = z
  .object({
    rating: z.union([z.literal(1), z.literal(-1), z.null()]).optional(), // null clears it
    notes: z.string().max(5000).optional(),
  })
  .refine((v) => v.rating !== undefined || v.notes !== undefined, "Nothing to update");

/** Save the conversation-level evaluation (overall rating and/or notes). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/conversations/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Invalid id" }, { status: 400 });

  const parsed = EvaluationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const updated = await updateEvaluation(id, parsed.data);
  if (!updated) return Response.json({ error: "Conversation not found" }, { status: 404 });
  return Response.json({ ok: true });
}
