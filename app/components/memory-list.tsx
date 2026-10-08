import Link from "next/link";
import { Card, Typography } from "@heyitscharlie/design-system";
import { listMemories } from "@/lib/memory";
import { DeleteButton } from "./delete-button";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" });

export async function MemoryList() {
  const memories = await listMemories();
  if (!memories.length) return <Typography variant="label">Nothing saved yet. Ask the agent to remember something.</Typography>;

  return (
    <div className="flex flex-col gap-2">
      {memories.map((m) => (
        <Card key={m.id} variant="card-transparent" className="flex-row items-start justify-between gap-3 border p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm">{m.text}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {dateFormat.format(new Date(m.createdAt))} ·{" "}
              {m.conversationId ? (
                <Link href={`/c/${m.conversationId}`} className="hover:underline">
                  from &ldquo;{m.conversationTitle}&rdquo;
                </Link>
              ) : (
                "source chat deleted"
              )}
            </span>
          </div>
          <DeleteButton endpoint={`/api/memories/${m.id}`} label="memory" />
        </Card>
      ))}
    </div>
  );
}
