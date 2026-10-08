"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Typography, cn } from "@heyitscharlie/design-system";
import type { AgentStep } from "@/lib/harness/agent/tool";
import type { AgentResult } from "@/lib/harness/agent/run-agent";
import { Trace } from "./trace";

type Message = { role: "user" | "assistant"; text: string; steps?: AgentStep[] };

const SUGGESTIONS = [
  "What's 1234 × 5678?",
  "What time is it in Tokyo?",
  "Remember that I prefer window seats",
  "What notes do I have?",
];

/** Matches the server's cap; older turns are dropped (simplest context management). */
const MAX_HISTORY = 30;

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Block body on purpose: whatever an effect returns, React calls as cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    if (!text.trim() || pending) return;
    const next: Message[] = [...messages, { role: "user", text: text.trim() }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);

    // Stateless server: send the conversation (text only), trimmed to the cap.
    let history = next.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text }));
    if (history[0]?.role === "assistant") history = history.slice(1);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      const result = data as AgentResult;
      // An empty reply would fail validation on the next turn, so never store one.
      setMessages([...next, { role: "assistant", text: result.reply.trim() || "(no reply)", steps: result.steps }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    // Fill the viewport below the header so the input sits at the bottom even when empty.
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col gap-4">
      {messages.length === 0 && (
        <div className="flex flex-col gap-3">
          <Typography variant="label">Try one of these, or ask anything:</Typography>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
            {m.steps && <Trace steps={m.steps} />}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-secondary text-secondary-foreground" : "border bg-card text-card-foreground",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pending && <Typography variant="label">Thinking…</Typography>}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
        <div ref={endRef} />
      </div>

      {/* Sticky: stays pinned to the bottom of the screen while messages scroll behind it. */}
      <form
        className="sticky bottom-0 -mx-2 mt-auto flex gap-2 rounded-lg bg-background/80 p-2 backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the agent…"
          maxLength={4000}
          disabled={pending}
          aria-label="Message"
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
