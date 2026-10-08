import { z } from "zod";
import type { FunctionDeclaration } from "@google/genai";

/**
 * A tool the agent can call. The Zod schema does three jobs:
 *   1. tells the model what arguments to send (converted to JSON Schema),
 *   2. validates what the model actually sent (LLM output is untrusted),
 *   3. types `execute`'s argument, so the implementation is type-safe.
 */
export type Tool<S extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  schema: S;
  execute: (args: z.infer<S>) => unknown | Promise<unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = Tool<any>;

/** Identity function that exists only so TypeScript infers `args` from `schema`. */
export function defineTool<S extends z.ZodType>(tool: Tool<S>): Tool<S> {
  return tool;
}

/** What Gemini needs to know about a tool. */
export function toFunctionDeclaration(tool: AnyTool): FunctionDeclaration {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...parameters } = z.toJSONSchema(tool.schema) as Record<string, unknown>;
  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: parameters,
  };
}

export type ToolCallResult = { ok: boolean; result: unknown };

/** One tool call in an agent run. The list of these is the "trace". */
export type AgentStep = { tool: string; args: unknown } & ToolCallResult;

/**
 * Validate the model's arguments, then run the tool. Never throws: any
 * failure becomes `{ error }` data that goes back to the model, so it can
 * correct itself or ask the user, instead of the whole request crashing.
 */
export async function callTool(tool: AnyTool, rawArgs: unknown): Promise<ToolCallResult> {
  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return { ok: false, result: { error: `Invalid arguments:\n${z.prettifyError(parsed.error)}` } };
  }
  try {
    return { ok: true, result: await tool.execute(parsed.data) };
  } catch (err) {
    return { ok: false, result: { error: err instanceof Error ? err.message : String(err) } };
  }
}
