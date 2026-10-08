"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@heyitscharlie/design-system";
import { CONVERSATIONS_CHANGED } from "./chat-title";

/**
 * Delete with an inline confirm (no browser dialog). Calls DELETE on `endpoint`,
 * then either navigates to `redirectTo` or refreshes the current page's data.
 */
export function DeleteButton({ endpoint, label, redirectTo }: { endpoint: string; label: string; redirectTo?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    if (!res?.ok) return;
    window.dispatchEvent(new Event(CONVERSATIONS_CHANGED)); // refresh the sidebar's Recent list
    if (redirectTo) router.push(redirectTo);
    else router.refresh(); // re-run the Server Component that listed it
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="icon-xs" aria-label={`Delete ${label}`} onClick={() => setConfirming(true)} className="text-muted-foreground hover:text-destructive">
        <Trash2 />
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-1 font-mono text-xs">
      Delete {label}?
      <Button variant="destructive" size="xs" disabled={busy} onClick={remove}>
        {busy ? "Deleting…" : "Delete"}
      </Button>
      <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </span>
  );
}
