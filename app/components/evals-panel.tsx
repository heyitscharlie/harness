"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardTitle, Typography, cn } from "@heyitscharlie/design-system";
import type { CaseResult } from "@/lib/harness/evals/schemas";
import { Trace } from "./trace";

export type CaseInfo = { id: string; name: string; input: string };
type CaseState = CaseResult | "running" | undefined;

export function EvalsPanel({ cases, defaultPrompt }: { cases: CaseInfo[]; defaultPrompt: string }) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [results, setResults] = useState<Record<string, CaseState>>({});
  const [running, setRunning] = useState(false);
  const modified = prompt !== defaultPrompt;

  async function runOne(caseId: string) {
    setResults((r) => ({ ...r, [caseId]: "running" }));
    let result: CaseResult;
    try {
      const res = await fetch("/api/eval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId, systemPrompt: modified ? prompt : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      result = data;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      result = { caseId, reply: "", steps: [], latencyMs: 0, passed: false, checks: [], error };
    }
    setResults((r) => ({ ...r, [caseId]: result }));
  }

  async function runAll() {
    setRunning(true);
    setResults({});
    // One at a time: results stream in, and we stay inside free-tier rate limits.
    for (const c of cases) await runOne(c.id);
    setRunning(false);
  }

  const done = Object.values(results).filter((r): r is CaseResult => typeof r === "object");
  const passed = done.filter((r) => r.passed && !r.error).length;
  const errored = done.filter((r) => r.error).length;
  const failed = done.length - passed - errored;
  const scored = done.filter((r) => !r.error);
  const avgLatency = scored.length ? scored.reduce((sum, r) => sum + r.latencyMs, 0) / scored.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Typography variant="h2">System prompt {modified && <span className="text-sm text-muted-foreground">(modified)</span>}</Typography>
          {modified && (
            <Button variant="ghost" size="sm" onClick={() => setPrompt(defaultPrompt)}>
              Reset
            </Button>
          )}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={7}
          maxLength={4000}
          aria-label="System prompt"
          className="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Typography variant="label">Edit the prompt and re-run to see if the agent still behaves.</Typography>
      </section>

      <section className="flex flex-wrap items-center gap-4">
        <Button size="lg" onClick={runAll} disabled={running}>
          {running ? "Running…" : `Run all ${cases.length} cases`}
        </Button>
        {done.length > 0 && (
          <span className="font-mono text-sm">
            <span className="font-bold">{passed}</span> passed · <span className={cn(failed && "text-destructive")}>{failed} failed</span> ·{" "}
            {errored} errored · avg {(avgLatency / 1000).toFixed(1)}s
          </span>
        )}
      </section>

      <section className="flex flex-col gap-3">
        {cases.map((c) => (
          <CaseCard key={c.id} info={c} state={results[c.id]} onRun={() => runOne(c.id)} disabled={running} />
        ))}
      </section>
    </div>
  );
}

function CaseCard({ info, state, onRun, disabled }: { info: CaseInfo; state: CaseState; onRun: () => void; disabled: boolean }) {
  const result = typeof state === "object" ? state : undefined;
  const status =
    state === "running" ? "…" : !result ? "○" : result.error ? "⚠" : result.passed ? "✓" : "✗";

  return (
    <Card variant="card-transparent" className="gap-3 border p-4">
      <div className="flex items-start justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className={cn(
              "font-mono",
              result?.passed && !result.error && "text-primary",
              result && !result.passed && "text-destructive",
              state === "running" && "animate-pulse",
            )}
          >
            {status}
          </span>
          {info.name}
        </CardTitle>
        <div className="flex items-center gap-2">
          {result && !result.error && <Typography variant="label">{(result.latencyMs / 1000).toFixed(1)}s</Typography>}
          <Button variant="ghost" size="xs" onClick={onRun} disabled={disabled || state === "running"}>
            Run
          </Button>
        </div>
      </div>

      <CardContent className="flex flex-col gap-3 text-sm">
        <Typography variant="label">input: {info.input}</Typography>

        {result?.error && <p className="text-destructive">Errored (not scored): {result.error.slice(0, 300)}</p>}

        {result && !result.error && (
          <>
            <Trace steps={result.steps} />
            <p className="whitespace-pre-wrap rounded-md bg-background/60 p-2">{result.reply || "(empty reply)"}</p>
            <ul className="flex flex-col gap-1 font-mono text-xs">
              {result.checks.map((check, i) => (
                <li key={i} className={cn(check.passed ? "text-muted-foreground" : "text-destructive")}>
                  {check.passed ? "✓" : "✗"} {check.label}
                  {check.detail && <span className="opacity-70"> · {check.detail}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
