import { cn } from "@heyitscharlie/design-system";
import type { AgentStep } from "@/lib/harness/agent/tool";

/** Tool calls as expandable chips: the agent's "working", made visible. */
export function Trace({ steps }: { steps: AgentStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, i) => (
        <details key={i} className="rounded-md border bg-background/60 px-2 py-1 font-mono text-xs">
          <summary className={cn("cursor-pointer break-all", step.ok ? "text-muted-foreground" : "text-destructive")}>
            {step.ok ? "⚙" : "✗"} {step.tool}({JSON.stringify(step.args ?? {})})
          </summary>
          <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(step.result, null, 2)}</pre>
        </details>
      ))}
    </div>
  );
}
