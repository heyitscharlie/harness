"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button, Typography, cn } from "@heyitscharlie/design-system";
import { Textarea } from "@/components/ui/textarea";
import type { Turn } from "@/lib/history";
import { ChatTitle } from "./chat-title";
import { Trace } from "./trace";

// id is missing only on the user's message until the page reloads from the database.
type Message = Omit<Turn, "id" | "latencyMs"> & { id?: number };

const SUGGESTIONS = [
  "What's 1234 × 5678?",
  "What time is it in Tokyo?",
  "Remember that I prefer window seats",
  "What notes do I have?",
];

export function ChatPanel({
  conversationId,
  title,
  initialTurns = [],
}: {
  conversationId?: string;
  title?: string;
  initialTurns?: Turn[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialTurns);
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
    setMessages((m) => [...m, { role: "user", text: text.trim(), steps: [], feedback: null }]);
    setInput("");
    setPending(true);
    setError(null);

    try {
      // Only the new message: the server loads earlier turns from the database.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setMessages((m) => [...m, data.turn]);
      // First message of a new chat: move to its permanent URL.
      if (!conversationId) router.replace(`/c/${data.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  async function rate(turnId: number, current: -1 | 1 | null, value: -1 | 1) {
    const next = current === value ? null : value; // clicking again clears it
    setMessages((m) => m.map((msg) => (msg.id === turnId ? { ...msg, feedback: next } : msg))); // optimistic
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnId, value: next }),
    });
  }

  return (
    // flex-1: fill the height <main> leaves, so the input sits at the bottom even when empty.
    <div className="flex flex-1 flex-col gap-4">
      {conversationId && title ? (
        <ChatTitle conversationId={conversationId} initialTitle={title} />
      ) : (
        <Typography variant="h2">New chat</Typography>
      )}

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
          <div key={m.id ?? `pending-${i}`} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
            {m.role === "assistant" && <Trace steps={m.steps} />}
            <div
              className={cn(
                "max-w-[min(85%,48rem)] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card text-card-foreground",
              )}
            >
              {m.text}
            </div>
            {m.role === "assistant" && m.id !== undefined && (
              <div className="flex gap-1">
                {([1, -1] as const).map((value) => {
                  const Icon = value === 1 ? ThumbsUp : ThumbsDown;
                  return (
                    <Button
                      key={value}
                      variant="ghost"
                      size="icon-xs"
                      aria-label={value === 1 ? "Good reply" : "Bad reply"}
                      aria-pressed={m.feedback === value}
                      onClick={() => rate(m.id!, m.feedback, value)}
                      className={cn(m.feedback === value ? "text-primary" : "text-muted-foreground")}
                    >
                      <Icon className={cn(m.feedback === value && "fill-current")} />
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {pending && <Typography variant="label">Thinking…</Typography>}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
        <div ref={endRef} />
      </div>

      {/* Sticky: stays pinned to the bottom of the screen while messages scroll behind it. */}
      <form
        className="sticky bottom-0 -mx-4 mt-auto flex items-end gap-2 bg-muted/80 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-16 lg:px-32 xl:px-48"
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
          className="max-h-48 min-h-9 resize-none bg-background py-1.5"
        />
        <Button type="submit" size="icon-lg" aria-label="Send" disabled={pending || !input.trim()}>
          <Send />
        </Button>
      </form>
    </div>
  );
}
