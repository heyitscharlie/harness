import { notFound } from "next/navigation";
import { z } from "zod";
import { getConversation, getTurns } from "@/lib/history";
import { ChatPanel } from "../../components/chat-panel";

// A saved conversation, loaded on the server straight from Postgres.
// loading.tsx (next to this file) is the Suspense boundary while it loads.
export default async function ConversationPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const conversation = z.uuid().safeParse(id).success ? await getConversation(id) : null;
  if (!conversation) notFound();
  const turns = await getTurns(id);
  return <ChatPanel conversationId={id} title={conversation.title} initialTurns={turns} />;
}
