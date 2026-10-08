import Link from "next/link";
import { Card, CardContent, CardTitle, Typography } from "@heyitscharlie/design-system";
import { getProductionStats } from "@/lib/history";

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

/**
 * Quality signals from real, saved conversations: the "production" half of
 * evals. The suite above tests known cases; this shows how real traffic went.
 */
export async function ProductionPanel() {
  const s = await getProductionStats();
  const tiles = [
    { label: "replies", value: String(s.replies) },
    { label: "with a tool error", value: pct(s.toolErrors, s.replies) },
    { label: "hit the step limit", value: String(s.stepLimit) },
    { label: "👍 / 👎", value: `${s.thumbsUp} / ${s.thumbsDown}` },
    { label: "avg latency", value: s.avgLatencyMs === null ? "–" : `${(s.avgLatencyMs / 1000).toFixed(1)}s` },
  ];

  return (
    <section className="flex flex-col gap-3">
      <Typography variant="h2">Production</Typography>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} variant="card-transparent" className="gap-1 border p-4">
            <span className="font-mono text-xl">{t.value}</span>
            <Typography variant="label">{t.label}</Typography>
          </Card>
        ))}
      </div>
      <Card variant="card-transparent" className="gap-2 border p-4">
        <CardTitle className="text-base">Needs a look</CardTitle>
        <CardContent className="flex flex-col gap-1 text-sm">
          {s.flagged.length === 0 ? (
            <Typography variant="label">Nothing flagged: no 👎 and no step-limit hits yet.</Typography>
          ) : (
            s.flagged.map((f, i) => (
              <Link key={i} href={`/c/${f.conversationId}`} className="truncate hover:underline">
                <span className="font-mono text-xs text-destructive">{f.reason}</span> {f.title}:{" "}
                <span className="text-muted-foreground">{f.text}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
