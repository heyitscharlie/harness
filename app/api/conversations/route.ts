import { listConversations } from "@/lib/history";

/** Recent conversations, newest first (for the sidebar). */
export async function GET(request: Request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 30, 100);
  return Response.json(await listConversations(limit));
}
