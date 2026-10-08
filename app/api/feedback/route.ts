import { z } from "zod";
import { setFeedback } from "@/lib/history";

const FeedbackSchema = z.object({
  turnId: z.number().int().positive(),
  value: z.union([z.literal(1), z.literal(-1), z.null()]), // null clears it
});

/** 👍 / 👎 on an assistant reply: a human label on real traffic. */
export async function POST(request: Request) {
  const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const updated = await setFeedback(parsed.data.turnId, parsed.data.value);
  if (!updated) return Response.json({ error: "Turn not found" }, { status: 404 });
  return Response.json({ ok: true });
}
