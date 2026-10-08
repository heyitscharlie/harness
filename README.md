# Agent Harness

A small, reusable **tool-calling agent** plus an **eval harness** that proves it behaves, wrapped in a Next.js app with a chat UI, saved history and a review workflow.

**Live:** [harness.heyitscharlie.com](https://harness.heyitscharlie.com) (access is managed through Vercel Deployment Protection).

**Stack:** Next.js 16 (App Router) · TypeScript · Zod 4 · Gemini (`@google/genai`) · Neon Postgres · Tailwind 4 · [`@heyitscharlie/design-system`](https://www.npmjs.com/package/@heyitscharlie/design-system) + shadcn/ui · Vercel

## What it does

| Page | What it's for |
| --- | --- |
| **Chat** (`/`, `/c/[id]`) | Talk to the agent. Each reply shows its tool calls, 👍/👎, and a **details** toggle with the full stored trace (latency, model, stop reason, every tool call's arguments and result). Titles are editable. |
| **History** (`/history`) | Every saved conversation with its stats, plus an overall 👍/👎 and evaluation notes per conversation. Chats can be deleted. |
| **Memory** (`/memory`) | What the agent *actually* saved with `add_note`, straight from Postgres, linked to the source chat. Memories can be deleted. |
| **Evals** (`/evals`) | **Production:** live quality signals from real traffic (tool-error rate, step-limit hits, feedback, latency) and the replies that need a look. Replies that *claim* to have saved something without a successful `add_note` call are flagged as unverified. **Test suite:** fixed cases scored automatically, with an editable system prompt to check a change before shipping it. |

## Architecture

```
lib/harness/     REUSABLE: no framework imports (enforced by ESLint)
  agent/
    tool.ts        defineTool(): one Zod schema → JSON Schema for the model,
                   runtime validation of its arguments, and types for execute()
    run-agent.ts   the agent loop: model → tool calls → results → … until a
                   text answer or maxSteps
    gemini.ts      client, model choice, retries with backoff for 429/503 only
  evals/
    schemas.ts     test cases and checks (a Zod discriminated union)
    checks.ts      deterministic checks + LLM-as-judge (its verdict is validated too)
    run-case.ts    run one case → score it → CaseResult

lib/example/     DEMO-SPECIFIC: replace in a new project
  tools.ts         calculator, get_current_time, add_note, list_notes
  agent.ts         system prompt (with a canary string for prompt-leak tests)
  suite.ts         the six eval cases

lib/history.ts   chat history in Postgres (raw SQL, bound parameters)
lib/memory.ts    the agent's memory: a Postgres-backed Store for the notes tools
db/schema.sql    conversations, turns (traces as JSONB), memories
app/             UI and thin API routes: validate with Zod, call the harness,
                 map failures to status codes
```

**Key decisions**

- **One schema, three jobs.** Each tool's Zod schema tells the model what to send, validates what it actually sent, and types the implementation.
- **Errors go back to the model as data.** Bad arguments, a hallucinated value or a failing tool become `{ error }` the model can react to, instead of a crash.
- **Check behaviour, not just text.** Evals assert which tools were called and with what arguments. Text checks normalise numbers (`7,006,652` = `7006652`).
- **Errored ≠ failed.** A rate limit says nothing about prompt quality, so provider errors are reported separately and never counted as regressions.
- **The server owns the conversation.** The client sends one message; history is loaded from Postgres, capped to limit tokens, and can't be tampered with.
- **Verify claims against reality.** The agent saying "I've saved that" isn't evidence; the `memories` table is. Evals use an in-memory store per case for isolation; the chat uses Postgres.
- **Offline + online evals.** The test suite catches regressions you can predict; production traces, feedback and review notes catch the ones you can't.

## Reusing the harness in another project

1. Copy `lib/harness/` (dependencies: `zod`, `@google/genai`).
2. Define tools with `defineTool({ name, description, schema, execute })`.
3. Run the agent: `runAgent({ systemPrompt, tools }, messages)` returns `{ reply, steps, stoppedReason }`.
4. Write cases (input + checks) and score them with `runCase(config, testCase)`.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values (or `vercel env pull`)
npm run db:migrate           # creates the tables (safe to re-run)
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API key ([AI Studio](https://aistudio.google.com/apikey)) |
| `DATABASE_URL` | Postgres connection string (Neon via the Vercel Marketplace) |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-flash-lite-latest`; pin an exact version for repeatable evals |

## Deployment

Pushes to `main` deploy to Vercel automatically. Environment variables live in the Vercel project, and the database was provisioned through the Vercel Marketplace (Neon).

## Next steps

- Run the eval suite in CI on every pull request.
- Stream replies and tool calls as they happen.
- One click to turn a reviewed conversation into a new eval case.
- Track token usage and cost per conversation.
