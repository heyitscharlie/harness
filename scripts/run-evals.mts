// Runs the eval suite from the command line (and in CI): npm run evals
// Exits 1 if any case FAILED, so CI goes red. Cases that ERRORED (provider
// outage, rate limit) are reported but don't fail the build: an outage
// isn't a regression.
import { appendFileSync } from "node:fs";
import { runCase } from "../lib/harness/evals/run-case";
import { createAgentConfig } from "../lib/example/agent";
import { createStore } from "../lib/example/tools";
import { SUITE } from "../lib/example/suite";

try {
  process.loadEnvFile(".env.local"); // local runs; CI passes env vars directly
} catch {}

const rows: string[] = [];
const tally = { passed: 0, failed: 0, errored: 0 };

for (const testCase of SUITE) {
  const r = await runCase(createAgentConfig(createStore()), testCase); // fresh store per case
  const status = r.error ? "errored" : r.passed ? "passed" : "failed";
  tally[status]++;
  const icon = { passed: "✅", failed: "❌", errored: "⚠️" }[status];
  const detail = r.error ?? r.checks.filter((c) => !c.passed).map((c) => `✗ ${c.label}${c.detail ? ` (${c.detail})` : ""}`).join("; ");
  console.log(`${icon} ${testCase.name} (${(r.latencyMs / 1000).toFixed(1)}s)${detail ? `\n   ${detail}` : ""}`);
  rows.push(`| ${icon} | ${testCase.name} | ${(r.latencyMs / 1000).toFixed(1)}s | ${(detail || "").replace(/\|/g, "\\|").slice(0, 200)} |`);
}

const summary = `${tally.passed} passed · ${tally.failed} failed · ${tally.errored} errored`;
console.log(`\n${summary}`);

// On GitHub Actions, also write a results table to the run's summary page.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Eval results\n\n**${summary}**\n\n| | Case | Latency | Failures |\n|---|---|---|---|\n${rows.join("\n")}\n`,
  );
}

process.exit(tally.failed > 0 ? 1 : 0);
