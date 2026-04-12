-- Portfolio /ops bootstrap schema for Obsidian -> Supabase -> API -> /ops
-- Apply in Supabase SQL editor or via migration tooling.

create extension if not exists pgcrypto;

create table if not exists public.ops_projects (
  id text primary key,
  name text not null,
  stage text not null check (stage in ('idea', 'planning', 'building', 'verifying', 'live')),
  summary text not null,
  repo text,
  branch text,
  deploy_url text,
  docs jsonb not null default '[]'::jsonb,
  sectors jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  operating_cadence jsonb not null default '[]'::jsonb,
  admin_surfaces jsonb not null default '[]'::jsonb,
  vault_views jsonb not null default '[]'::jsonb,
  github_focus jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ops_tasks (
  id text primary key,
  title text not null,
  project_id text not null references public.ops_projects(id) on delete cascade,
  category text not null check (category in ('planning', 'build', 'deploy', 'ops', 'docs')),
  status text not null check (status in ('planned', 'doing', 'verifying', 'shipped', 'blocked')),
  summary text not null,
  completed_work jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  related_docs jsonb not null default '[]'::jsonb,
  related_commits jsonb not null default '[]'::jsonb,
  note_ids jsonb not null default '[]'::jsonb,
  needs_decision jsonb not null default '[]'::jsonb,
  updated_at text not null
);

create index if not exists idx_ops_tasks_project_id on public.ops_tasks(project_id);
create index if not exists idx_ops_tasks_status on public.ops_tasks(status);

alter table public.ops_projects add column if not exists sectors jsonb not null default '[]'::jsonb;
alter table public.ops_projects add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.ops_projects add column if not exists operating_cadence jsonb not null default '[]'::jsonb;
alter table public.ops_projects add column if not exists admin_surfaces jsonb not null default '[]'::jsonb;
alter table public.ops_projects add column if not exists vault_views jsonb not null default '[]'::jsonb;
alter table public.ops_projects add column if not exists github_focus jsonb not null default '[]'::jsonb;

create table if not exists public.ops_notes (
  id text primary key,
  title text not null,
  type text not null check (type in ('daily-chat-log', 'project-ops', 'aeyong-debug', 'weekly-review', 'reference')),
  project text,
  tags jsonb not null default '[]'::jsonb,
  updated_at text not null,
  path text not null,
  workspace_root_label text not null,
  summary text not null,
  highlights jsonb not null default '[]'::jsonb,
  headings jsonb not null default '[]'::jsonb,
  preview jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  raw_excerpt text not null
);

create index if not exists idx_ops_notes_type on public.ops_notes(type);
create unique index if not exists idx_ops_notes_path on public.ops_notes(path);

alter table public.ops_notes add column if not exists links jsonb not null default '[]'::jsonb;

create table if not exists public.ops_worklogs (
  id text primary key,
  note_id text not null references public.ops_notes(id) on delete cascade,
  title text not null,
  path text not null,
  project text,
  actor text not null,
  repo text,
  branch text,
  status text not null check (status in ('planned', 'running', 'completed', 'blocked')),
  summary text not null,
  source_machine text,
  session_id text,
  run_id text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null,
  tags jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb
);

create index if not exists idx_ops_worklogs_updated_at on public.ops_worklogs(updated_at desc);
create index if not exists idx_ops_worklogs_project on public.ops_worklogs(project);
create index if not exists idx_ops_worklogs_actor on public.ops_worklogs(actor);

create table if not exists public.ops_artifacts (
  id text primary key,
  note_id text not null references public.ops_notes(id) on delete cascade,
  title text not null,
  artifact_type text not null check (artifact_type in ('worklog', 'decision', 'learning')),
  project text,
  path text not null,
  summary text not null,
  actor text,
  source_machine text,
  repo text,
  branch text,
  status text,
  tags jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  learnings jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  linked_note_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_artifacts_updated_at on public.ops_artifacts(updated_at desc);
create index if not exists idx_ops_artifacts_type on public.ops_artifacts(artifact_type);
create index if not exists idx_ops_artifacts_project on public.ops_artifacts(project);

create table if not exists public.ops_sync_state (
  key text primary key,
  value text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ops_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  source text not null default 'obsidian-sync',
  projects_count integer not null default 0,
  tasks_count integer not null default 0,
  notes_count integer not null default 0,
  message text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.ops_projects enable row level security;
alter table public.ops_tasks enable row level security;
alter table public.ops_notes enable row level security;
alter table public.ops_worklogs enable row level security;
alter table public.ops_artifacts enable row level security;
alter table public.ops_sync_state enable row level security;
alter table public.ops_sync_runs enable row level security;

-- Public read is intentionally NOT granted yet.
-- Start with service-role only reads/writes from Next server and sync script.
-- If you later want browser-side anon access, add explicit select policies per table.
