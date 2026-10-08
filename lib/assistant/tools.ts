// Demo tools for this app. In a new project, this is the file you replace.
import { z } from "zod";
import { defineTool } from "@/lib/harness/agent/tool";

/**
 * Where notes are saved. Passed in rather than global: evals use a fresh
 * in-memory store per case (isolated), while the chat uses Postgres
 * (lib/memory.ts) so "I've saved that" is actually true.
 */
export type Store = {
  addNote(text: string): Promise<number>; // returns the new total
  listNotes(): Promise<string[]>;
};

export function createStore(): Store {
  const notes: string[] = [];
  return {
    addNote: async (text) => notes.push(text),
    listNotes: async () => [...notes],
  };
}

export function createTools(store: Store) {
  return [
    defineTool({
      name: "calculator",
      description: "Do exact arithmetic on two numbers. Use this instead of calculating in your head.",
      schema: z.object({
        a: z.number(),
        b: z.number(),
        op: z.enum(["add", "subtract", "multiply", "divide"]),
      }),
      execute: ({ a, b, op }) => {
        if (op === "divide" && b === 0) throw new Error("Division by zero is undefined.");
        const result = { add: a + b, subtract: a - b, multiply: a * b, divide: a / b }[op];
        return { result };
      },
    }),

    defineTool({
      name: "get_current_time",
      description: "Get the current date and time in a time zone.",
      schema: z.object({
        timeZone: z.string().describe('IANA time zone name, e.g. "Europe/London" or "Asia/Tokyo".'),
      }),
      execute: ({ timeZone }) => {
        // Throws a RangeError for unknown zones; callTool turns that into an error for the model.
        const formatted = new Intl.DateTimeFormat("en-GB", {
          timeZone,
          dateStyle: "full",
          timeStyle: "short",
        }).format(new Date());
        return { timeZone, now: formatted };
      },
    }),

    defineTool({
      name: "add_note",
      description: "Save a note for the user to remember later.",
      schema: z.object({ text: z.string().min(1).max(500) }),
      execute: async ({ text }) => ({ saved: true, count: await store.addNote(text) }),
    }),

    defineTool({
      name: "list_notes",
      description: "List the user's saved notes.",
      schema: z.object({}),
      execute: async () => ({ notes: await store.listNotes() }),
    }),
  ];
}
