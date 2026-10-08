-- Chat history. Safe to re-run: everything is "if not exists".

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

-- One row per message. Assistant turns also store the agent's trace.
create table if not exists turns (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  steps jsonb not null default '[]', -- tool calls: what the evals inspect
  latency_ms integer,
  model text,
  stopped_reason text, -- 'done' | 'max_steps'
  feedback smallint check (feedback in (-1, 1)), -- 👎 / 👍
  created_at timestamptz not null default now()
);

create index if not exists turns_conversation_idx on turns (conversation_id, id);

-- Conversation-level evaluation: an overall rating and free-text notes.
alter table conversations add column if not exists rating smallint check (rating in (-1, 1));
alter table conversations add column if not exists notes text;

-- What the agent saved with add_note. Kept if the source chat is deleted.
create table if not exists memories (
  id bigint generated always as identity primary key,
  text text not null,
  conversation_id uuid references conversations (id) on delete set null,
  created_at timestamptz not null default now()
);
