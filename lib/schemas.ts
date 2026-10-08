import { z } from "zod";

/**
 * A check is one assertion about a model output. It's a discriminated union:
 * the `type` field tells Zod (and TypeScript) which shape the rest has.
 */
export const CheckSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("contains"), value: z.string() }),
  z.object({ type: z.literal("not_contains"), value: z.string() }),
  z.object({ type: z.literal("regex"), pattern: z.string() }),
  z.object({ type: z.literal("max_length"), chars: z.number().int().positive() }),
  // Output must be JSON that parses against the suite's Zod output schema.
  z.object({ type: z.literal("json_schema") }),
  // A top-level field of the JSON output must equal a value.
  z.object({
    type: z.literal("json_field_equals"),
    field: z.string(),
    equals: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  // A second LLM call grades the output 1-5 against a rubric.
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

/** Body of POST /api/eval: run one test case with a (possibly edited) prompt. */
export const RunRequestSchema = z.object({
  suiteId: z.string(),
  caseId: z.string(),
  systemPrompt: z.string().min(1).max(4000),
});
export type RunRequest = z.infer<typeof RunRequestSchema>;

/** The judge model's verdict. The judge is an LLM too, so we validate it. */
export const JudgeVerdictSchema = z.object({
  score: z.number().int().min(1).max(5),
  reasoning: z.string(),
});

/** Expected output of the "listing extraction" suite. */
export const ListingSchema = z.object({
  title: z.string().min(1),
  price: z.number().nonnegative().nullable(),
  currency: z.enum(["GBP", "USD", "EUR"]).nullable(),
  condition: z.enum(["new", "like_new", "used", "for_parts"]),
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
  output: string;
  latencyMs: number;
  passed: boolean;
  checks: CheckResult[];
  error?: string;
};
