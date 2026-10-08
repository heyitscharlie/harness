// Demo tools for this app. In a new project, this is the file you replace.
import { z } from "zod";
import { defineTool } from "@/lib/harness/agent/tool";

/**
 * Where tools write to. Passed in rather than global so each eval case gets
 * a fresh, isolated store (and a real app could swap in a database).
 */
export type Store = { notes: string[] };
export const createStore = (): Store => ({ notes: [] });

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
      execute: ({ text }) => {
        store.notes.push(text);
        return { saved: true, count: store.notes.length };
      },
    }),

    defineTool({
      name: "list_notes",
      description: "List the user's saved notes.",
      schema: z.object({}),
      execute: () => ({ notes: store.notes }),
    }),
  ];
}
