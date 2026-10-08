import { z } from "zod";
import type { AgentStep } from "../agent/tool";

/**
 * A check is one assertion about an agent run. It's a discriminated union:
 * the `type` field tells Zod (and TypeScript) which shape the rest has.
 */
export const CheckSchema = z.discriminatedUnion("type", [
  // About the final reply text.
  z.object({ type: z.literal("contains"), value: z.string() }),
  z.object({ type: z.literal("not_contains"), value: z.string() }),
  z.object({ type: z.literal("regex"), pattern: z.string() }),
  z.object({ type: z.literal("max_length"), chars: z.number().int().positive() }),
  // About behaviour: which tools the agent called, and with what.
  z.object({ type: z.literal("tool_called"), tool: z.string() }),
  z.object({ type: z.literal("tool_not_called"), tool: z.string() }),
  z.object({
    type: z.literal("tool_arg_equals"),
    tool: z.string(),
    arg: z.string(),
    equals: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  // A second LLM call grades the reply 1-5 against a rubric.
  z.object({
    type: z.literal("llm_judge"),
    rubric: z.string(),
    threshold: z.number().int().min(1).max(5).default(4),
  }),
]);
// z.input is the shape you write (threshold optional); z.infer is the parsed
// shape (threshold always filled in by the default).
export type CheckInput = z.input<typeof CheckSchema>;
export type Check = z.infer<typeof CheckSchema>;

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.string(),
  checks: z.array(CheckSchema).min(1),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

/** The judge model's verdict. The judge is an LLM too, so we validate it. */
export const JudgeVerdictSchema = z.object({
  score: z.number().int().min(1).max(5),
  reasoning: z.string(),
});

// Results are produced by our own server code, not untrusted input, so
// plain TypeScript types are enough here.
export type CheckResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

export type CaseResult = {
  caseId: string;
  reply: string;
  steps: AgentStep[];
  latencyMs: number;
  passed: boolean;
  checks: CheckResult[];
  error?: string;
};
