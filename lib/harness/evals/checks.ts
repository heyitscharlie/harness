import { DEFAULT_MODEL, getClient, toGeminiSchema } from "../agent/gemini";
import type { AgentStep } from "../agent/tool";
import { JudgeVerdictSchema, type Check, type CheckResult } from "./schemas";

/** Everything a check can look at from one agent run. */
export type RunContext = { input: string; reply: string; steps: AgentStep[] };

/**
 * Lowercase, and drop thousands separators between digits ("7,006,652" →
 * "7006652"), so correct answers don't fail on formatting alone.
 */
const normalise = (s: string) => s.toLowerCase().replace(/(?<=\d)[,\s](?=\d{3}\b)/g, "");

/** Case-insensitive for strings, strict for everything else. */
const looseEquals = (a: unknown, b: unknown) =>
  typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b;

export async function runCheck(check: Check, ctx: RunContext): Promise<CheckResult> {
  // TypeScript narrows `check` in each branch, e.g. only "regex" has `pattern`.
  switch (check.type) {
    case "contains": {
      const passed = normalise(ctx.reply).includes(normalise(check.value));
      return { label: `contains "${check.value}"`, passed };
    }
    case "not_contains": {
      const passed = !normalise(ctx.reply).includes(normalise(check.value));
      return { label: `doesn't contain "${check.value}"`, passed };
    }
    case "regex": {
      const passed = new RegExp(check.pattern, "i").test(ctx.reply);
      return { label: `matches /${check.pattern}/`, passed };
    }
    case "max_length": {
      const passed = ctx.reply.length <= check.chars;
      return { label: `≤ ${check.chars} chars`, passed, detail: `${ctx.reply.length} chars` };
    }
    case "tool_called": {
      const passed = ctx.steps.some((s) => s.tool === check.tool);
      return { label: `called ${check.tool}`, passed };
    }
    case "tool_not_called": {
      const passed = !ctx.steps.some((s) => s.tool === check.tool);
      return { label: `didn't call ${check.tool}`, passed };
    }
    case "tool_arg_equals": {
      const seen = ctx.steps
        .filter((s) => s.tool === check.tool)
        .map((s) => (s.args as Record<string, unknown> | undefined)?.[check.arg]);
      const passed = seen.some((v) => looseEquals(v, check.equals));
      return {
        label: `${check.tool}.${check.arg} = ${JSON.stringify(check.equals)}`,
        passed,
        detail: seen.length ? `got ${seen.map((v) => JSON.stringify(v)).join(", ")}` : `${check.tool} was not called`,
      };
    }
    case "llm_judge":
      return judge(check, ctx);
  }
}

/** LLM-as-judge: a second model call grades the reply against a rubric. */
async function judge(check: Extract<Check, { type: "llm_judge" }>, ctx: RunContext): Promise<CheckResult> {
  const label = `judge ≥ ${check.threshold}: ${check.rubric}`;
  const trace = ctx.steps.map((s) => `${s.tool}(${JSON.stringify(s.args)}) → ${JSON.stringify(s.result)}`).join("\n");
  const prompt = `You are a strict evaluator of an AI assistant's reply.
Score how well the reply meets the rubric, from 1 (fails completely) to 5 (fully meets it).

Rubric: ${check.rubric}

User message:
${ctx.input}

Tool calls the assistant made:
${trace || "(none)"}

Assistant reply:
${ctx.reply}`;

  try {
    const res = await getClient().models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        temperature: 0, // as repeatable as possible
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiSchema(JudgeVerdictSchema),
      },
    });
    // The judge is an LLM too: validate its output like any other.
    const verdict = JudgeVerdictSchema.safeParse(JSON.parse(res.text ?? ""));
    if (!verdict.success) return { label, passed: false, detail: "Judge returned an invalid verdict." };
    const { score, reasoning } = verdict.data;
    return { label, passed: score >= check.threshold, detail: `${score}/5: ${reasoning}` };
  } catch (err) {
    return { label, passed: false, detail: `Judge failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
