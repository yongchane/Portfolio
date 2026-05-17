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

create table if not exists public.ops_worker_heartbeats (
  id text primary key,
  worker_name text not null,
  machine text not null,
  status text not null check (status in ('online', 'offline', 'error', 'stale')),
  version text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_ops_worker_heartbeats_last_seen on public.ops_worker_heartbeats(last_seen_at desc);
create index if not exists idx_ops_worker_heartbeats_machine on public.ops_worker_heartbeats(machine);

create table if not exists public.ops_host_status (
  id uuid primary key default gen_random_uuid(),
  machine text not null,
  cpu jsonb not null default '{}'::jsonb,
  memory jsonb not null default '{}'::jsonb,
  disk jsonb not null default '{}'::jsonb,
  uptime_seconds integer,
  network jsonb not null default '{}'::jsonb,
  processes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_host_status_machine_created on public.ops_host_status(machine, created_at desc);

create table if not exists public.ops_openclaw_status (
  id uuid primary key default gen_random_uuid(),
  machine text not null,
  gateway_status text not null default 'unknown',
  model jsonb not null default '{}'::jsonb,
  sessions jsonb not null default '[]'::jsonb,
  cron jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_openclaw_status_machine_created on public.ops_openclaw_status(machine, created_at desc);

create table if not exists public.ops_sync_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('worklogs', 'github', 'openclaw', 'host', 'all')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')) default 'queued',
  requested_by text,
  requested_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  result jsonb not null default '{}'::jsonb
);

create index if not exists idx_ops_sync_requests_status_requested on public.ops_sync_requests(status, requested_at desc);

create table if not exists public.ops_agents (
  id text primary key,
  name text not null,
  role text not null check (role in ('manager', 'qa', 'security', 'uiux', 'docs', 'github', 'coding')),
  provider text,
  runtime text not null check (runtime in ('openclaw', 'acp', 'codex', 'manual')),
  model text,
  status text not null check (status in ('active', 'inactive', 'error')) default 'active',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_agents_role on public.ops_agents(role);

create table if not exists public.ops_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.ops_agents(id) on delete restrict,
  project_id text references public.ops_projects(id) on delete set null,
  task_id text references public.ops_tasks(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled', 'needs_approval')) default 'queued',
  prompt text not null,
  scope jsonb not null default '{}'::jsonb,
  result_summary text,
  changed_files jsonb not null default '[]'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  worklog_id text references public.ops_worklogs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  finished_at timestamptz,
  error text
);

create index if not exists idx_ops_agent_runs_status_created on public.ops_agent_runs(status, created_at desc);
create index if not exists idx_ops_agent_runs_project on public.ops_agent_runs(project_id);

create table if not exists public.ops_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.ops_projects(id) on delete cascade,
  repo text,
  category text not null check (category in ('qa', 'security', 'feature', 'update', 'uiux')),
  agent_id text references public.ops_agents(id) on delete set null,
  severity text not null check (severity in ('low', 'medium', 'high', 'info')) default 'info',
  title text not null,
  comment text not null,
  recommendation text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null check (status in ('open', 'resolved', 'ignored')) default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_ai_reviews_project_category on public.ops_ai_reviews(project_id, category);
create index if not exists idx_ops_ai_reviews_status on public.ops_ai_reviews(status);

create table if not exists public.ops_project_canvases (
  project_id text primary key references public.ops_projects(id) on delete cascade,
  canvas jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_canvases_updated on public.ops_project_canvases(updated_at desc);

create table if not exists public.ops_project_planning_documents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null unique references public.ops_projects(id) on delete cascade,
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  status text not null check (status in ('draft', 'reviewing', 'approved', 'archived')) default 'draft',
  summary text not null default '',
  generated_from jsonb not null default '{}'::jsonb,
  canvas_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_planning_documents_project on public.ops_project_planning_documents(project_id);
create index if not exists idx_ops_project_planning_documents_status on public.ops_project_planning_documents(status);
create index if not exists idx_ops_project_planning_documents_updated on public.ops_project_planning_documents(updated_at desc);

create table if not exists public.ops_project_prds (
  project_id text primary key references public.ops_projects(id) on delete cascade,
  overview text not null default '',
  goals jsonb not null default '[]'::jsonb,
  target_users jsonb not null default '[]'::jsonb,
  core_values jsonb not null default '[]'::jsonb,
  scenarios jsonb not null default '[]'::jsonb,
  success_metrics jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_prds_updated on public.ops_project_prds(updated_at desc);

create table if not exists public.ops_project_requirements (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  status text not null check (status in ('todo', 'doing', 'done', 'blocked')) default 'todo',
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_requirements_project on public.ops_project_requirements(project_id, sort_order);
create index if not exists idx_ops_project_requirements_status on public.ops_project_requirements(status);

create table if not exists public.ops_project_features (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  requirement_id text not null references public.ops_project_requirements(id) on delete cascade,
  title text not null,
  description text not null default '',
  user_role_ids jsonb not null default '[]'::jsonb,
  status text not null check (status in ('todo', 'doing', 'done', 'blocked')) default 'todo',
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_features_project on public.ops_project_features(project_id, sort_order);
create index if not exists idx_ops_project_features_requirement on public.ops_project_features(requirement_id);
create index if not exists idx_ops_project_features_status on public.ops_project_features(status);

create table if not exists public.ops_project_specifications (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  feature_id text not null references public.ops_project_features(id) on delete cascade,
  title text not null,
  behavior text not null default '',
  acceptance_criteria jsonb not null default '[]'::jsonb,
  edge_cases jsonb not null default '[]'::jsonb,
  linked_page_ids jsonb not null default '[]'::jsonb,
  linked_api_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  status text not null check (status in ('todo', 'doing', 'done', 'blocked')) default 'todo',
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_specifications_project on public.ops_project_specifications(project_id, sort_order);
create index if not exists idx_ops_project_specifications_feature on public.ops_project_specifications(feature_id);
create index if not exists idx_ops_project_specifications_status on public.ops_project_specifications(status);

create table if not exists public.ops_project_ia_pages (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  title text not null,
  route text,
  depth integer not null default 1 check (depth >= 1),
  parent_id text references public.ops_project_ia_pages(id) on delete set null,
  description text not null default '',
  linked_specification_ids jsonb not null default '[]'::jsonb,
  linked_user_flow_step_ids jsonb not null default '[]'::jsonb,
  linked_wireframe_block_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  source text not null check (source in ('github-analysis', 'manual', 'ai-suggestion')) default 'github-analysis',
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_ia_pages_project_depth on public.ops_project_ia_pages(project_id, depth, sort_order);
create index if not exists idx_ops_project_ia_pages_parent on public.ops_project_ia_pages(parent_id);
create index if not exists idx_ops_project_ia_pages_route on public.ops_project_ia_pages(project_id, route);

create table if not exists public.ops_project_user_flows (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  title text not null,
  actor_role_id text,
  status text not null check (status in ('draft', 'reviewing', 'approved', 'archived')) default 'draft',
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_user_flows_project on public.ops_project_user_flows(project_id, sort_order);
create index if not exists idx_ops_project_user_flows_status on public.ops_project_user_flows(status);

create table if not exists public.ops_project_user_flow_steps (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  flow_id text not null references public.ops_project_user_flows(id) on delete cascade,
  page_id text references public.ops_project_ia_pages(id) on delete set null,
  action text not null,
  system_response text not null default '',
  next_step_ids jsonb not null default '[]'::jsonb,
  linked_specification_ids jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_user_flow_steps_project on public.ops_project_user_flow_steps(project_id, sort_order);
create index if not exists idx_ops_project_user_flow_steps_flow on public.ops_project_user_flow_steps(flow_id, sort_order);
create index if not exists idx_ops_project_user_flow_steps_page on public.ops_project_user_flow_steps(page_id);

create table if not exists public.ops_project_wireframe_blocks (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  page_id text not null references public.ops_project_ia_pages(id) on delete cascade,
  section_name text not null,
  layout_type text not null check (layout_type in ('hero', 'list', 'form', 'table', 'kanban', 'canvas', 'modal', 'sidebar', 'chart', 'custom')) default 'custom',
  content_purpose text not null default '',
  linked_specification_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  source text not null check (source in ('idea', 'github', 'manual', 'ai')) default 'github',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_wireframe_blocks_project on public.ops_project_wireframe_blocks(project_id, sort_order);
create index if not exists idx_ops_project_wireframe_blocks_page on public.ops_project_wireframe_blocks(page_id, sort_order);

create table if not exists public.ops_project_architecture_nodes (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  kind text not null check (kind in ('frontend', 'api', 'service', 'database', 'storage', 'job', 'integration', 'auth', 'deploy', 'agent')),
  label text not null,
  description text not null default '',
  code_refs jsonb not null default '[]'::jsonb,
  api_links jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  source text not null check (source in ('github-analysis', 'manual', 'ai-suggestion')) default 'github-analysis',
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_architecture_nodes_project on public.ops_project_architecture_nodes(project_id, sort_order);
create index if not exists idx_ops_project_architecture_nodes_kind on public.ops_project_architecture_nodes(project_id, kind);

create table if not exists public.ops_project_github_evidence (
  id text primary key,
  project_id text not null references public.ops_projects(id) on delete cascade,
  repo text not null,
  branch text not null,
  path text not null,
  evidence_type text not null check (evidence_type in ('route', 'component', 'api', 'service', 'schema', 'job', 'docs', 'config', 'auth')),
  summary text not null default '',
  imports jsonb not null default '[]'::jsonb,
  api_calls jsonb not null default '[]'::jsonb,
  headings jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) not null default 0.750 check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_ops_project_github_evidence_project_path on public.ops_project_github_evidence(project_id, path);
create index if not exists idx_ops_project_github_evidence_type on public.ops_project_github_evidence(project_id, evidence_type);
create index if not exists idx_ops_project_github_evidence_repo on public.ops_project_github_evidence(repo, branch);

create table if not exists public.ops_project_ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.ops_projects(id) on delete cascade,
  target_type text not null check (target_type in ('prd', 'requirement', 'feature', 'specification', 'ia-page', 'user-flow', 'wireframe', 'architecture', 'canvas', 'agent-task')),
  action text not null check (action in ('create', 'update', 'delete', 'link')),
  proposed_value jsonb not null default '{}'::jsonb,
  rationale text not null default '',
  evidence_ids jsonb not null default '[]'::jsonb,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_by text not null default 'ai',
  created_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  decided_by text
);

create index if not exists idx_ops_project_ai_suggestions_project_status on public.ops_project_ai_suggestions(project_id, status, created_at desc);
create index if not exists idx_ops_project_ai_suggestions_target on public.ops_project_ai_suggestions(project_id, target_type);

create table if not exists public.ops_project_exports (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.ops_projects(id) on delete cascade,
  export_type text not null check (export_type in ('prd', 'specifications', 'ia', 'user-flow', 'architecture', 'agent-brief', 'canvas')),
  format text not null check (format in ('md', 'txt', 'png', 'mermaid', 'xlsx', 'json')),
  filename text not null,
  payload jsonb not null default '{}'::jsonb,
  artifact_path text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ops_project_exports_project_created on public.ops_project_exports(project_id, created_at desc);
create index if not exists idx_ops_project_exports_type on public.ops_project_exports(project_id, export_type, format);

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
alter table public.ops_worker_heartbeats enable row level security;
alter table public.ops_host_status enable row level security;
alter table public.ops_openclaw_status enable row level security;
alter table public.ops_sync_requests enable row level security;
alter table public.ops_agents enable row level security;
alter table public.ops_agent_runs enable row level security;
alter table public.ops_ai_reviews enable row level security;
alter table public.ops_project_canvases enable row level security;
alter table public.ops_project_planning_documents enable row level security;
alter table public.ops_project_prds enable row level security;
alter table public.ops_project_requirements enable row level security;
alter table public.ops_project_features enable row level security;
alter table public.ops_project_specifications enable row level security;
alter table public.ops_project_ia_pages enable row level security;
alter table public.ops_project_user_flows enable row level security;
alter table public.ops_project_user_flow_steps enable row level security;
alter table public.ops_project_wireframe_blocks enable row level security;
alter table public.ops_project_architecture_nodes enable row level security;
alter table public.ops_project_github_evidence enable row level security;
alter table public.ops_project_ai_suggestions enable row level security;
alter table public.ops_project_exports enable row level security;
alter table public.ops_sync_state enable row level security;
alter table public.ops_sync_runs enable row level security;

-- Public read is intentionally NOT granted yet.
-- Start with service-role only reads/writes from Next server and sync script.
-- If you later want browser-side anon access, add explicit select policies per table.

insert into public.ops_agents (id, name, role, provider, runtime, model, status, permissions)
values
  ('aeyong-manager', 'Aeyong Manager', 'manager', 'openclaw', 'openclaw', null, 'active', '{"canReadProjects":true,"canWriteOpsData":true,"requiresApprovalForCode":true}'::jsonb),
  ('qa-agent', 'QA Agent', 'qa', 'openclaw', 'openclaw', null, 'active', '{"canReadRepos":true,"canCreateReviews":true,"requiresApprovalForCode":true}'::jsonb),
  ('security-agent', 'Security Agent', 'security', 'openclaw', 'openclaw', null, 'active', '{"canReadRepos":true,"canCreateReviews":true,"requiresApprovalForCode":true}'::jsonb),
  ('uiux-agent', 'UI/UX Agent', 'uiux', 'openclaw', 'openclaw', null, 'active', '{"canReadDocs":true,"canCreateReviews":true,"requiresApprovalForCode":true}'::jsonb),
  ('docs-agent', 'Docs Agent', 'docs', 'openclaw', 'openclaw', null, 'active', '{"canReadDocs":true,"canWriteDocs":true,"requiresApprovalForCode":true}'::jsonb),
  ('github-review-agent', 'GitHub Review Agent', 'github', 'openclaw', 'openclaw', null, 'active', '{"canReadGitHub":true,"canCreateReviews":true,"requiresApprovalForWrites":true}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  provider = excluded.provider,
  runtime = excluded.runtime,
  model = excluded.model,
  status = excluded.status,
  permissions = excluded.permissions,
  updated_at = timezone('utc', now());
