import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";

/** Zod schema → the plain JSON Schema object Gemini accepts. */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  return jsonSchema;
}

/**
 * "latest" aliases follow Google's newest model. Handy for a demo, but for
 * serious evals pin an exact version via GEMINI_MODEL: a silently updated
 * (or retired) model can change your scores.
 */
export const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

let client: GoogleGenAI | undefined;

/** Created on first use, so a missing key fails with a clear message at call time. */
export function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** 429 = rate limited, 503 = overloaded: both temporary. A 400 would fail again, so never retry it. */
const isTransient = (err: unknown) => [429, 503].includes((err as { status?: number }).status ?? 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * generateContent with retries and exponential backoff (2s, 4s, 8s, plus
 * jitter so parallel callers don't retry in lockstep). Use this instead of
 * calling the client directly.
 */
export async function generate(params: GenerateContentParameters, retries = 3): Promise<GenerateContentResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getClient().models.generateContent(params);
    } catch (err) {
      if (attempt >= retries || !isTransient(err)) throw err;
      await sleep(2 ** (attempt + 1) * 1000 + Math.random() * 500);
    }
  }
}
