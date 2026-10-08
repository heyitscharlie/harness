import type { Turn } from "@/lib/history";

/**
 * Everything stored about one agent reply: a one-line summary that
 * expands to the raw JSON trace. The "full trace" view, straight from Postgres.
 */
export function TurnDetails({ turn }: { turn: Pick<Turn, "steps" | "latencyMs" | "model" | "stoppedReason"> }) {
  const failed = turn.steps.filter((s) => !s.ok).length;
  const summary = [
    turn.latencyMs !== null && `${(turn.latencyMs / 1000).toFixed(1)}s`,
    turn.model,
    turn.stoppedReason,
    `${turn.steps.length} tool call${turn.steps.length === 1 ? "" : "s"}`,
    failed > 0 && `${failed} failed`,
  ].filter(Boolean);

  return (
    <details className="font-mono text-xs text-muted-foreground">
      <summary className="cursor-pointer px-1 py-1 select-none hover:text-foreground">details · {summary.join(" · ")}</summary>
      <pre className="mt-1 max-w-[min(85vw,48rem)] overflow-x-auto rounded-md bg-background/60 p-2 text-foreground">
        {JSON.stringify(
          { latencyMs: turn.latencyMs, model: turn.model, stoppedReason: turn.stoppedReason, steps: turn.steps },
          null,
          2,
        )}
      </pre>
    </details>
  );
}
