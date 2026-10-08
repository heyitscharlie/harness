import { notFound } from "next/navigation";
import { z } from "zod";
import { conversationExists, getTurns } from "@/lib/history";
import { ChatPanel } from "../../components/chat-panel";

// A saved conversation, loaded on the server straight from Postgres.
// loading.tsx (next to this file) is the Suspense boundary while it loads.
export default async function ConversationPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !(await conversationExists(id))) notFound();
  const turns = await getTurns(id);
  return <ChatPanel conversationId={id} initialTurns={turns} />;
}
