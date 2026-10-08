import { Suspense } from "react";
import type { Metadata } from "next";
import { Typography } from "@heyitscharlie/design-system";
import { MemoryList } from "../components/memory-list";

export const metadata: Metadata = { title: "Memory · Agent Harness" };

export default function MemoryPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-1">
        <Typography variant="h2">Memory</Typography>
        <p className="text-sm text-muted-foreground">
          What the agent has actually saved with its add_note tool, straight from the database. If it says
          &ldquo;I&rsquo;ve saved that&rdquo; and nothing appears here, the claim was false.
        </p>
      </div>
      <Suspense fallback={<Typography variant="label">Loading memories…</Typography>}>
        <MemoryList />
      </Suspense>
    </div>
  );
}
