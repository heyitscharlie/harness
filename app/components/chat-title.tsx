"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Input, Typography } from "@heyitscharlie/design-system";

/** Tells the sidebar's Recent list to refetch after a rename. */
export const CONVERSATIONS_CHANGED = "conversations-changed";

/** A conversation title you can click to rename. Enter saves, Escape cancels. */
export function ChatTitle({ conversationId, initialTitle }: { conversationId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);

  async function save() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === title) return setDraft(title); // empty or unchanged: keep the old one
    const previous = title;
    setTitle(next); // optimistic
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: next }),
    }).catch(() => null);
    if (res?.ok) window.dispatchEvent(new Event(CONVERSATIONS_CHANGED));
    else setTitle(previous); // roll back if the save failed
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        maxLength={120}
        aria-label="Conversation title"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur(); // blur triggers save
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        // md:text-xl too: the design system's Input sets md:text-sm, which would shrink the title.
        className="h-auto py-0.5 font-heading text-xl md:text-xl"
      />
    );
  }

  return (
    <div className="group flex min-w-0 items-center gap-1">
      <Typography variant="h2" className="cursor-text truncate" onClick={() => setEditing(true)} title="Click to rename">
        {title}
      </Typography>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Rename conversation"
        onClick={() => setEditing(true)}
        className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Pencil />
      </Button>
    </div>
  );
}
