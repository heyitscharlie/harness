// The agent's long-term memory: notes saved with add_note, stored in Postgres
// so they survive across requests and deploys (unlike server memory).
import { neon } from "@neondatabase/serverless";
import type { Store } from "@/lib/example/tools";

const sql = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return neon(url);
};

export type Memory = { id: number; text: string; conversationId: string | null; conversationTitle: string | null; createdAt: string };

/** A Store for the agent's tools, writing to Postgres and linked to the conversation. */
export function createPostgresStore(conversationId: string): Store {
  return {
    async addNote(text) {
      await sql()`insert into memories (text, conversation_id) values (${text}, ${conversationId})`;
      const [row] = await sql()`select count(*) as total from memories`;
      return Number(row.total);
    },
    async listNotes() {
      const rows = await sql()`select text from memories order by id`;
      return rows.map((r) => r.text);
    },
  };
}

export async function listMemories(): Promise<Memory[]> {
  const rows = await sql()`
    select m.id, m.text, m.conversation_id, c.title, m.created_at
    from memories m left join conversations c on c.id = m.conversation_id
    order by m.id desc`;
  return rows.map((r) => ({
    id: Number(r.id),
    text: r.text,
    conversationId: r.conversation_id,
    conversationTitle: r.title,
    createdAt: r.created_at,
  }));
}

export async function deleteMemory(id: number): Promise<boolean> {
  const rows = await sql()`delete from memories where id = ${id} returning id`;
  return rows.length > 0;
}
