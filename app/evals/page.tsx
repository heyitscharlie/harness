import type { Metadata } from "next";
import { Typography } from "@heyitscharlie/design-system";
import { SYSTEM_PROMPT } from "@/lib/example/agent";
import { SUITE } from "@/lib/example/suite";
import { EvalsPanel } from "../components/evals-panel";

export const metadata: Metadata = { title: "Evals · Agent Harness" };

// Developer tool: proves the chat behaves. Server Component, so it reads the
// suite on the server and passes only plain, serialisable data to the client.
export default function EvalsPage() {
  const cases = SUITE.map(({ id, name, input }) => ({ id, name, input }));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="label">Developer tools</Typography>
        <p className="text-sm text-muted-foreground">
          Runs the agent against a fixed test suite and scores what it did: which tools it called, with what
          arguments, and what it replied. Edit the system prompt to check a change before shipping it.
        </p>
      </div>
      <EvalsPanel cases={cases} defaultPrompt={SYSTEM_PROMPT} />
    </div>
  );
}
