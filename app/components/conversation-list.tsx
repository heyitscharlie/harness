import Link from "next/link";
import { cn } from "cn"; // the design system's cn is client-only (its bundle is "use client")
import { Card, Typography } from "@heyitscharlie/design-system";
import { listConversations } from "@/lib/history";
import { ConversationReview } from "./conversation-review";
import { DeleteButton } from "./delete-button";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export async function ConversationList() {
  const conversations = await listConversations();
  if (!conversations.length) return <Typography variant="label">No conversations yet.</Typography>;

  return (
    <div className="flex flex-col gap-2">
      {conversations.map((c) => (
        <Card key={c.id} variant="card-transparent" className="gap-3 border p-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/c/${c.id}`} className="min-w-0 truncate font-medium hover:underline">
                {c.title}
              </Link>
              <DeleteButton endpoint={`/api/conversations/${c.id}`} label="chat" />
            </div>
            <div className="flex flex-wrap gap-x-3 font-mono text-xs text-muted-foreground">
              <span>{dateFormat.format(new Date(c.createdAt))}</span>
              <span>
                {c.replies} {c.replies === 1 ? "reply" : "replies"}
              </span>
              {c.toolErrors > 0 && <span className="text-destructive">{c.toolErrors} tool error(s)</span>}
              {(c.thumbsUp > 0 || c.thumbsDown > 0) && (
                <span className={cn(c.thumbsDown > 0 && "text-destructive")}>
                  replies 👍 {c.thumbsUp} · 👎 {c.thumbsDown}
                </span>
              )}
            </div>
          </div>
          <ConversationReview id={c.id} initialRating={c.rating} initialNotes={c.notes} />
        </Card>
      ))}
    </div>
  );
}
