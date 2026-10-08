import type { Content, Part } from "@google/genai";
import { z } from "zod";
import { DEFAULT_MODEL, generate } from "./gemini";
import { callTool, toFunctionDeclaration, type AgentStep, type AnyTool } from "./tool";

/** The simple message shape the UI and API use. */
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(4000), // caps tokens per message: cost, latency and reliability
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export type AgentConfig = {
  systemPrompt: string;
  tools: AnyTool[];
  model?: string;
  /** Upper bound on model calls per run: stops loops and runaway cost. */
  maxSteps?: number;
  temperature?: number;
};

export type AgentResult = {
  reply: string;
  steps: AgentStep[];
  stoppedReason: "done" | "max_steps";
};

/**
 * The agent loop: call the model; if it asks for tools, run them and feed
 * the results back; repeat until it answers in text or hits maxSteps.
 */
export async function runAgent(config: AgentConfig, messages: ChatMessage[]): Promise<AgentResult> {
  const { systemPrompt, tools, model = DEFAULT_MODEL, maxSteps = 5, temperature = 0 } = config;
  const toolsByName = new Map(tools.map((t) => [t.name, t]));
  const steps: AgentStep[] = [];

  // Gemini calls the assistant role "model".
  const contents: Content[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  for (let i = 0; i < maxSteps; i++) {
    const res = await generate({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        tools: tools.length ? [{ functionDeclarations: tools.map(toFunctionDeclaration) }] : undefined,
      },
    });

    const calls = res.functionCalls;
    if (!calls?.length) {
      return { reply: res.text ?? "", steps, stoppedReason: "done" };
    }

    // Keep the model's turn exactly as returned (it can carry metadata the
    // model needs on the next call), then answer each call it made.
    const modelTurn = res.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);

    const responses: Part[] = [];
    for (const call of calls) {
      const name = call.name ?? "";
      const tool = toolsByName.get(name);
      const outcome = tool
        ? await callTool(tool, call.args)
        : { ok: false, result: { error: `Unknown tool "${name}".` } };
      steps.push({ tool: name, args: call.args, ...outcome });
      responses.push({
        functionResponse: {
          id: call.id,
          name,
          // Gemini expects an object here; errors are already { error }.
          response: outcome.ok ? { output: outcome.result } : (outcome.result as Record<string, unknown>),
        },
      });
    }
    contents.push({ role: "user", parts: responses });
  }

  return { reply: "Sorry, I couldn't finish that within my step limit.", steps, stoppedReason: "max_steps" };
}
