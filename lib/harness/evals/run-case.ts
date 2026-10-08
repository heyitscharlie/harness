import { runAgent, type AgentConfig } from "../agent/run-agent";
import { runCheck } from "./checks";
import type { CaseResult, TestCase } from "./schemas";

/** Run one test case through the agent, then score it with every check. */
export async function runCase(config: AgentConfig, testCase: TestCase): Promise<CaseResult> {
  const start = Date.now();
  try {
    const { reply, steps } = await runAgent(config, [{ role: "user", text: testCase.input }]);
    const latencyMs = Date.now() - start; // agent time only, not judging time
    const ctx = { input: testCase.input, reply, steps };
    const checks = await Promise.all(testCase.checks.map((check) => runCheck(check, ctx)));
    return { caseId: testCase.id, reply, steps, latencyMs, checks, passed: checks.every((c) => c.passed) };
  } catch (err) {
    // e.g. rate limited or network down: report it as a failed case, don't crash the suite.
    return {
      caseId: testCase.id,
      reply: "",
      steps: [],
      latencyMs: Date.now() - start,
      checks: [],
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
