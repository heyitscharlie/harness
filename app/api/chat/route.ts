import { z } from "zod";
import { runAgent } from "@/lib/harness/agent/run-agent";
import { DEFAULT_MODEL } from "@/lib/harness/agent/gemini";
import { createAgentConfig } from "@/lib/example/agent";
import { createStore } from "@/lib/example/tools";
import { conversationExists, createConversation, getTurns, saveExchange } from "@/lib/history";

// Agent runs make several model calls; give Vercel room beyond its default.
export const maxDuration = 60;

const ChatRequestSchema = z.object({
  // Omitted for the first message of a new conversation.
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(4000),
});

/** How many earlier turns to send the model: caps tokens, cost and latency. */
const MAX_HISTORY = 30;

// Demo-only: notes live in memory for as long as this server instance does.
const store = createStore();

/**
 * The server owns the conversation: the client sends only the new message,
 * and earlier turns come from the database, so they can't be tampered with.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { message } = parsed.data;

  let conversationId = parsed.data.conversationId;
  if (conversationId && !(await conversationExists(conversationId))) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const history = conversationId
    ? (await getTurns(conversationId)).slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text }))
    : [];

  try {
    const start = Date.now();
    const result = await runAgent(createAgentConfig(store), [...history, { role: "user", text: message }]);
    const latencyMs = Date.now() - start;
    const text = result.reply.trim() || "(no reply)";

    // Only create the conversation once the agent has actually answered.
    conversationId ??= await createConversation(message.slice(0, 60));
    const turnId = await saveExchange(conversationId, message, {
      text,
      steps: result.steps,
      latencyMs,
      model: DEFAULT_MODEL,
      stoppedReason: result.stoppedReason,
    });

    return Response.json({ conversationId, turn: { id: turnId, role: "assistant", text, steps: result.steps, latencyMs, feedback: null } });
  } catch (err) {
    // The model provider failed (after retries). Not the client's fault: 502.
    return Response.json({ error: err instanceof Error ? err.message : "Model call failed" }, { status: 502 });
  }
}
