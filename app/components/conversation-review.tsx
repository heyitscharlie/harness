"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button, Typography, cn } from "@heyitscharlie/design-system";
import { Textarea } from "@/components/ui/textarea";

type SaveState = "idle" | "saving" | "saved" | "error";

/** Overall 👍/👎 and evaluation notes for one conversation. */
export function ConversationReview({
  id,
  initialRating,
  initialNotes,
}: {
  id: string;
  initialRating: -1 | 1 | null;
  initialNotes: string;
}) {
  const [rating, setRating] = useState(initialRating);
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [status, setStatus] = useState<SaveState>("idle");

  async function save(changes: { rating?: -1 | 1 | null; notes?: string }) {
    setStatus("saving");
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    }).catch(() => null);
    setStatus(res?.ok ? "saved" : "error");
    return res?.ok ?? false;
  }

  async function rate(value: -1 | 1) {
    const next = rating === value ? null : value; // clicking again clears it
    setRating(next); // optimistic
    if (!(await save({ rating: next }))) setRating(rating);
  }

  async function saveNotes() {
    if (notes === savedNotes) return; // nothing changed
    if (await save({ notes })) setSavedNotes(notes);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Typography variant="label">Overall</Typography>
        {([1, -1] as const).map((value) => {
          const Icon = value === 1 ? ThumbsUp : ThumbsDown;
          return (
            <Button
              key={value}
              variant="ghost"
              size="icon-sm"
              aria-label={value === 1 ? "Good conversation" : "Bad conversation"}
              aria-pressed={rating === value}
              onClick={() => rate(value)}
              className={cn(rating === value ? (value === 1 ? "text-primary" : "text-destructive") : "text-muted-foreground")}
            >
              <Icon className={cn(rating === value && "fill-current")} />
            </Button>
          );
        })}
        <span className={cn("ml-auto font-mono text-xs", status === "error" ? "text-destructive" : "text-muted-foreground")}>
          {{ idle: "", saving: "Saving…", saved: "Saved", error: "Couldn't save" }[status]}
        </span>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes} // autosave when you click away
        placeholder="Evaluation notes: what went well or wrong, and whether this should become a test case…"
        maxLength={5000}
        aria-label="Evaluation notes"
        className="min-h-16 bg-background text-sm"
      />
    </div>
  );
}
