// Chat history in Postgres (Neon). App code, not harness: the harness
// returns everything worth saving; where it's stored is this app's choice.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { AgentStep } from "@/lib/harness/agent/tool";

let client: NeonQueryFunction<false, false> | undefined;

/** Created on first use, so a missing DATABASE_URL fails with a clear message. */
function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    client = neon(url);
  }
  return client;
}

export type Turn = {
  id: number;
  role: "user" | "assistant";
  text: string;
  steps: AgentStep[];
  latencyMs: number | null;
  feedback: -1 | 1 | null;
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  replies: number;
  toolErrors: number;
  thumbsUp: number;
  thumbsDown: number;
  rating: -1 | 1 | null; // overall, for the whole conversation
  notes: string;
};

// Tagged templates send every ${value} as a bound parameter: no SQL injection.

export async function createConversation(title: string): Promise<string> {
  const rows = await sql()`insert into conversations (title) values (${title}) returning id`;
  return rows[0].id;
}

export async function getConversation(id: string): Promise<{ id: string; title: string } | null> {
  const rows = await sql()`select id, title from conversations where id = ${id}`;
  return rows[0] ? { id: rows[0].id, title: rows[0].title } : null;
}

export async function conversationExists(id: string): Promise<boolean> {
  const rows = await sql()`select 1 from conversations where id = ${id}`;
  return rows.length > 0;
}

/** Conversations, newest first, with per-conversation quality signals. */
export async function listConversations(limit = 100): Promise<ConversationSummary[]> {
  const rows = await sql()`
    select c.id, c.title, c.created_at, c.rating, c.notes,
      count(t.id) filter (where t.role = 'assistant') as replies,
      count(t.id) filter (where t.role = 'assistant' and exists (
        select 1 from jsonb_array_elements(t.steps) s where (s->>'ok')::boolean = false)) as tool_errors,
      count(t.id) filter (where t.feedback = 1) as thumbs_up,
      count(t.id) filter (where t.feedback = -1) as thumbs_down
    from conversations c left join turns t on t.conversation_id = c.id
    group by c.id order by c.created_at desc limit ${limit}`;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    replies: Number(r.replies),
    toolErrors: Number(r.tool_errors),
    thumbsUp: Number(r.thumbs_up),
    thumbsDown: Number(r.thumbs_down),
    rating: r.rating,
    notes: r.notes ?? "",
  }));
}

export async function getTurns(conversationId: string): Promise<Turn[]> {
  const rows = await sql()`
    select id, role, text, steps, latency_ms, feedback from turns
    where conversation_id = ${conversationId} order by id`;
  return rows.map((r) => ({
    id: Number(r.id),
    role: r.role,
    text: r.text,
    steps: r.steps,
    latencyMs: r.latency_ms,
    feedback: r.feedback,
  }));
}

/** Save one exchange (user message + agent reply) atomically. Returns the reply's turn id. */
export async function saveExchange(
  conversationId: string,
  userText: string,
  reply: { text: string; steps: AgentStep[]; latencyMs: number; model: string; stoppedReason: string },
): Promise<number> {
  const [, inserted] = await sql().transaction([
    sql()`insert into turns (conversation_id, role, text) values (${conversationId}, 'user', ${userText})`,
    sql()`
      insert into turns (conversation_id, role, text, steps, latency_ms, model, stopped_reason)
      values (${conversationId}, 'assistant', ${reply.text}, ${JSON.stringify(reply.steps)}::jsonb,
              ${reply.latencyMs}, ${reply.model}, ${reply.stoppedReason})
      returning id`,
  ]);
  return Number(inserted[0].id);
}

/** Update a conversation's title and/or evaluation. Only the fields provided change. */
export async function updateConversation(
  id: string,
  changes: { title?: string; rating?: -1 | 1 | null; notes?: string },
): Promise<boolean> {
  const rows = await sql()`
    update conversations set
      title = coalesce(${changes.title ?? null}, title),
      rating = case when ${"rating" in changes}::boolean then ${changes.rating ?? null}::smallint else rating end,
      notes = case when ${"notes" in changes}::boolean then ${changes.notes ?? null} else notes end
    where id = ${id} returning id`;
  return rows.length > 0;
}

export async function setFeedback(turnId: number, value: -1 | 1 | null): Promise<boolean> {
  const rows = await sql()`
    update turns set feedback = ${value} where id = ${turnId} and role = 'assistant' returning id`;
  return rows.length > 0;
}

export type ProductionStats = {
  replies: number;
  toolErrors: number;
  stepLimit: number;
  thumbsUp: number;
  thumbsDown: number;
  avgLatencyMs: number | null;
  flagged: { conversationId: string; title: string; text: string; reason: string }[];
};

/** Live quality signals from real traffic: the "production" half of evals. */
export async function getProductionStats(): Promise<ProductionStats> {
  const [totals] = await sql()`
    select
      count(*) as replies,
      count(*) filter (where exists (
        select 1 from jsonb_array_elements(steps) s where (s->>'ok')::boolean = false)) as tool_errors,
      count(*) filter (where stopped_reason = 'max_steps') as step_limit,
      count(*) filter (where feedback = 1) as thumbs_up,
      count(*) filter (where feedback = -1) as thumbs_down,
      round(avg(latency_ms)) as avg_latency
    from turns where role = 'assistant'`;

  // The replies worth a human look: 👎 or hit the step limit, newest first.
  const flagged = await sql()`
    select t.conversation_id, c.title, t.text,
      case when t.feedback = -1 then '👎' else 'step limit' end as reason
    from turns t join conversations c on c.id = t.conversation_id
    where t.role = 'assistant' and (t.feedback = -1 or t.stopped_reason = 'max_steps')
    order by t.id desc limit 10`;

  return {
    replies: Number(totals.replies),
    toolErrors: Number(totals.tool_errors),
    stepLimit: Number(totals.step_limit),
    thumbsUp: Number(totals.thumbs_up),
    thumbsDown: Number(totals.thumbs_down),
    avgLatencyMs: totals.avg_latency === null ? null : Number(totals.avg_latency),
    flagged: flagged.map((r) => ({ conversationId: r.conversation_id, title: r.title, text: r.text, reason: r.reason })),
  };
}
