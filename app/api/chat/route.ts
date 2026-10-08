import { z } from "zod";
import { ChatMessageSchema, runAgent } from "@/lib/harness/agent/run-agent";
import { createAgentConfig } from "@/lib/example/agent";
import { createStore } from "@/lib/example/tools";

// Agent runs make several model calls; give Vercel room beyond its default.
export const maxDuration = 60;

const ChatRequestSchema = z.object({
  // The client sends the whole conversation each time, so the server stays
  // stateless. Capped so one request can't send an enormous context.
  messages: z.array(ChatMessageSchema).min(1).max(30),
});

// Demo-only: notes live in memory for as long as this server instance does.
// A real app would use a database here.
const store = createStore();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await runAgent(createAgentConfig(store), parsed.data.messages);
    return Response.json(result);
  } catch (err) {
    // The model provider failed (after retries). Not the client's fault: 502.
    return Response.json({ error: err instanceof Error ? err.message : "Model call failed" }, { status: 502 });
  }
}
