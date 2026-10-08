import { z } from "zod";
import { runCase } from "@/lib/harness/evals/run-case";
import { createAgentConfig } from "@/lib/example/agent";
import { SUITE } from "@/lib/example/suite";
import { createStore } from "@/lib/example/tools";

export const maxDuration = 60;

const EvalRequestSchema = z.object({
  caseId: z.string(),
  // Optional override, so the UI can edit the prompt and see if evals still pass.
  systemPrompt: z.string().min(1).max(4000).optional(),
});

/**
 * Runs ONE case per request. The client loops over the suite, which shows
 * results as they arrive and keeps each request well inside time limits.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = EvalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const testCase = SUITE.find((c) => c.id === parsed.data.caseId);
  if (!testCase) {
    return Response.json({ error: `Unknown case "${parsed.data.caseId}"` }, { status: 404 });
  }

  // Fresh store per case: no case can affect another. runCase never throws;
  // model failures come back as `error` on the result.
  const result = await runCase(createAgentConfig(createStore(), parsed.data.systemPrompt), testCase);
  return Response.json(result);
}
