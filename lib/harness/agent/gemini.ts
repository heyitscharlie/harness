import { GoogleGenAI } from "@google/genai";

/**
 * "latest" aliases follow Google's newest model. Handy for a demo, but for
 * serious evals pin an exact version via GEMINI_MODEL: a silently updated
 * model can change your scores.
 */
export const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

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
