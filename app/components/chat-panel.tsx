"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Typography, cn } from "@heyitscharlie/design-system";
import { Textarea } from "@/components/ui/textarea";
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
    // flex-1: fill the height <main> leaves, so the input sits at the bottom even when empty.
    <div className="flex flex-1 flex-col gap-4">
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
                "max-w-[min(85%,48rem)] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card text-card-foreground",
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
        className="sticky bottom-0 -mx-4 mt-auto flex items-end gap-2 bg-muted/80 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter adds a new line. Skip while an IME
            // (e.g. Japanese input) is composing, or Enter would send half a word.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Message the agent… (Shift+Enter for a new line)"
          maxLength={4000}
          rows={1}
          aria-label="Message"
          // Grows with the text (field-sizing-content) up to max-h-48, then scrolls.
          className="max-h-48 min-h-9 resize-none py-1.5"
        />
        <Button type="submit" size="lg" disabled={pending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
