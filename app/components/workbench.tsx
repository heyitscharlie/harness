"use client";

import { useState } from "react";
import { Button, ModeToggle, Typography } from "@heyitscharlie/design-system";
import { ChatPanel } from "./chat-panel";
import { EvalsPanel, type CaseInfo } from "./evals-panel";

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "evals", label: "Evals" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Workbench({ model, defaultPrompt, cases }: { model: string; defaultPrompt: string; cases: CaseInfo[] }) {
  const [tab, setTab] = useState<TabId>("chat");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Typography variant="h1">Agent Harness</Typography>
          <Typography variant="label">model: {model}</Typography>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </header>

      <nav role="tablist" className="flex gap-1 border-b pb-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            variant={tab === t.id ? "secondary" : "ghost"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </nav>

      {/* Both panels stay mounted so a conversation or eval run survives switching tabs. */}
      <div hidden={tab !== "chat"}>
        <ChatPanel />
      </div>
      <div hidden={tab !== "evals"}>
        <EvalsPanel cases={cases} defaultPrompt={defaultPrompt} />
      </div>
    </div>
  );
}
