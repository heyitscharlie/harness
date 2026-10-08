import { listConversations } from "@/lib/history";

/** Recent conversations, newest first (for the sidebar). */
export async function GET() {
  return Response.json(await listConversations());
}
