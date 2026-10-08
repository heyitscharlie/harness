import { Suspense } from "react";
import type { Metadata } from "next";
import { Typography } from "@heyitscharlie/design-system";
import { ConversationList } from "../components/conversation-list";

export const metadata: Metadata = { title: "History · Agent Harness" };

// The shell renders instantly; the list streams in from Postgres.
export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-1">
        <Typography variant="h2">History</Typography>
        <p className="text-sm text-muted-foreground">Every saved conversation, newest first.</p>
      </div>
      <Suspense fallback={<Typography variant="label">Loading conversations…</Typography>}>
        <ConversationList />
      </Suspense>
    </div>
  );
}
