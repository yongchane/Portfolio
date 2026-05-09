import type {
  NoteItem,
  OpsArtifactRecord,
  OpsConsoleData,
  OpsAgent,
  OpsAgentRun,
  OpsAiReview,
  OpsHostStatus,
  OpsOpenClawPushedStatus,
  OpsSourceHealth,
  OpsSyncRequest,
  OpsWorkerHeartbeat,
  Project,
  ProjectAdminSurface,
  ProjectChecklistItem,
  ProjectSectorProgress,
  Task,
  WorklogRecord,
} from "@/lib/ops/types";

export type SupabaseOpsConsoleData = Omit<OpsConsoleData, "github" | "vault" | "openclaw">;

export type SyncStateRow = {
  key: string;
  value: string | null;
  updated_at: string;
};

export type SyncRunRow = {
  status: "started" | "succeeded" | "failed";
  message: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  name: string;
  stage: Project["stage"];
  summary: string;
  repo: string | null;
  branch: string | null;
  deploy_url: string | null;
  docs: string[] | null;
  sectors: ProjectSectorProgress[] | null;
  checklist: ProjectChecklistItem[] | null;
  operating_cadence: string[] | null;
  admin_surfaces: ProjectAdminSurface[] | null;
  vault_views: string[] | null;
  github_focus: string[] | null;
};

export type TaskRow = {
  id: string;
  title: string;
  project_id: string;
  category: Task["category"];
  status: Task["status"];
  summary: string;
  completed_work: string[] | null;
  next_actions: string[] | null;
  related_docs: string[] | null;
  related_commits: string[] | null;
  note_ids: string[] | null;
  needs_decision: string[] | null;
  updated_at: string;
};

export type NoteRow = {
  id: string;
  title: string;
  type: NoteItem["type"];
  project: string | null;
  tags: string[] | null;
  updated_at: string;
  path: string;
  workspace_root_label: string;
  summary: string;
  highlights: string[] | null;
  headings: string[] | null;
  preview: string[] | null;
  links: string[] | null;
  raw_excerpt: string;
};

export type WorklogRow = {
  id: string;
  note_id: string;
  title: string;
  path: string;
  project: string | null;
  actor: string;
  repo: string | null;
  branch: string | null;
  status: WorklogRecord["status"];
  summary: string;
  source_machine: string | null;
  session_id: string | null;
  run_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  tags: string[] | null;
  highlights: string[] | null;
  decisions: string[] | null;
  blockers: string[] | null;
  next_actions: string[] | null;
};


export type ArtifactRow = {
  id: string;
  note_id: string;
  title: string;
  artifact_type: OpsArtifactRecord["artifactType"];
  project: string | null;
  path: string;
  summary: string;
  actor: string | null;
  source_machine: string | null;
  repo: string | null;
  branch: string | null;
  status: WorklogRecord["status"] | null;
  tags: string[] | null;
  highlights: string[] | null;
  decisions: string[] | null;
  learnings: string[] | null;
  blockers: string[] | null;
  next_actions: string[] | null;
  linked_note_ids: string[] | null;
  updated_at: string;
};


export type WorkerHeartbeatRow = {
  id: string;
  worker_name: string;
  machine: string;
  status: OpsWorkerHeartbeat["status"];
  version: string | null;
  last_seen_at: string;
  payload: Record<string, unknown> | null;
};

export type HostStatusRow = {
  id: string;
  machine: string;
  cpu: Record<string, unknown> | null;
  memory: Record<string, unknown> | null;
  disk: Record<string, unknown> | null;
  uptime_seconds: number | null;
  network: Record<string, unknown> | null;
  processes: unknown[] | null;
  created_at: string;
};

export type OpenClawStatusRow = {
  id: string;
  machine: string;
  gateway_status: string;
  model: Record<string, unknown> | null;
  sessions: unknown[] | null;
  cron: Record<string, unknown> | null;
  issues: unknown[] | null;
  created_at: string;
};

export type SyncRequestRow = {
  id: string;
  type: OpsSyncRequest["type"];
  status: OpsSyncRequest["status"];
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  result: Record<string, unknown> | null;
};

export type AgentRow = {
  id: string;
  name: string;
  role: OpsAgent["role"];
  provider: string | null;
  runtime: OpsAgent["runtime"];
  model: string | null;
  status: OpsAgent["status"];
  permissions: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AgentRunRow = {
  id: string;
  agent_id: string;
  project_id: string | null;
  task_id: string | null;
  status: OpsAgentRun["status"];
  prompt: string;
  scope: Record<string, unknown> | null;
  result_summary: string | null;
  changed_files: string[] | null;
  verification: Record<string, unknown> | null;
  worklog_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};

export type AiReviewRow = {
  id: string;
  project_id: string;
  repo: string | null;
  category: OpsAiReview["category"];
  agent_id: string | null;
  severity: OpsAiReview["severity"];
  title: string;
  comment: string;
  recommendation: string | null;
  evidence: Record<string, unknown> | null;
  status: OpsAiReview["status"];
  created_at: string;
  updated_at: string;
};

export function buildSupabaseSourceHealth(args: {
  configured: boolean;
  available: boolean;
  mode: "auto" | "local" | "supabase";
  latestSyncRun?: SyncRunRow | null;
}): OpsSourceHealth {
  return {
    supabaseConfigured: args.configured,
    supabaseReachable: args.available,
    activeMode: "supabase",
    preferredMode: args.mode,
    notesMode: "supabase",
    lastSyncStatus: args.latestSyncRun?.status,
    lastSyncMessage: args.latestSyncRun?.message ?? undefined,
    lastSyncAt: args.latestSyncRun?.created_at,
  };
}

function jsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage,
    summary: row.summary,
    repo: row.repo ?? undefined,
    branch: row.branch ?? undefined,
    deployUrl: row.deploy_url ?? undefined,
    docs: jsonArray(row.docs),
    sectors: jsonArray(row.sectors),
    checklist: jsonArray(row.checklist),
    operatingCadence: jsonArray(row.operating_cadence),
    adminSurfaces: jsonArray(row.admin_surfaces),
    vaultViews: jsonArray(row.vault_views),
    githubFocus: jsonArray(row.github_focus),
  };
}

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    category: row.category,
    status: row.status,
    summary: row.summary,
    completedWork: jsonArray(row.completed_work),
    nextActions: jsonArray(row.next_actions),
    relatedDocs: jsonArray(row.related_docs),
    relatedCommits: jsonArray(row.related_commits),
    noteIds: jsonArray(row.note_ids),
    needsDecision: jsonArray(row.needs_decision),
    updatedAt: row.updated_at,
  };
}

export function mapNoteRow(row: NoteRow): NoteItem {
  const normalizedPath = row.path.replace(/\\/g, "/");
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    project: row.project ?? undefined,
    tags: jsonArray(row.tags),
    updatedAt: row.updated_at,
    path: normalizedPath,
    workspaceRootLabel: row.workspace_root_label,
    folder: normalizedPath.split("/").slice(0, -1).join("/") || "(root)",
    links: jsonArray(row.links),
    summary: row.summary,
    highlights: jsonArray(row.highlights),
    headings: jsonArray(row.headings),
    preview: jsonArray(row.preview),
    rawExcerpt: row.raw_excerpt,
  };
}

export function mapWorklogRow(row: WorklogRow): WorklogRecord {
  return {
    id: row.id,
    noteId: row.note_id,
    title: row.title,
    path: row.path.replace(/\\/g, "/"),
    project: row.project ?? undefined,
    actor: row.actor,
    repo: row.repo ?? undefined,
    branch: row.branch ?? undefined,
    status: row.status,
    summary: row.summary,
    sourceMachine: row.source_machine ?? undefined,
    sessionId: row.session_id ?? undefined,
    runId: row.run_id ?? undefined,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    updatedAt: row.updated_at,
    tags: jsonArray(row.tags),
    highlights: jsonArray(row.highlights),
    decisions: jsonArray(row.decisions),
    blockers: jsonArray(row.blockers),
    nextActions: jsonArray(row.next_actions),
  };
}


export function mapArtifactRow(row: ArtifactRow): OpsArtifactRecord {
  return {
    id: row.id,
    noteId: row.note_id,
    title: row.title,
    artifactType: row.artifact_type,
    project: row.project ?? undefined,
    path: row.path.replace(/\\/g, "/"),
    summary: row.summary,
    actor: row.actor ?? undefined,
    sourceMachine: row.source_machine ?? undefined,
    repo: row.repo ?? undefined,
    branch: row.branch ?? undefined,
    status: row.status ?? undefined,
    tags: jsonArray(row.tags),
    highlights: jsonArray(row.highlights),
    decisions: jsonArray(row.decisions),
    learnings: jsonArray(row.learnings),
    blockers: jsonArray(row.blockers),
    nextActions: jsonArray(row.next_actions),
    linkedNoteIds: jsonArray(row.linked_note_ids).length
      ? jsonArray(row.linked_note_ids)
      : [row.note_id],
    updatedAt: row.updated_at,
  };
}


export function mapWorkerHeartbeatRow(row: WorkerHeartbeatRow): OpsWorkerHeartbeat {
  return {
    id: row.id,
    workerName: row.worker_name,
    machine: row.machine,
    status: row.status,
    version: row.version ?? undefined,
    lastSeenAt: row.last_seen_at,
    payload: row.payload ?? {},
  };
}

export function mapHostStatusRow(row: HostStatusRow): OpsHostStatus {
  return {
    id: row.id,
    machine: row.machine,
    cpu: row.cpu ?? {},
    memory: row.memory ?? {},
    disk: row.disk ?? {},
    uptimeSeconds: row.uptime_seconds ?? undefined,
    network: row.network ?? {},
    processes: row.processes ?? [],
    createdAt: row.created_at,
  };
}

export function mapOpenClawStatusRow(row: OpenClawStatusRow): OpsOpenClawPushedStatus {
  return {
    id: row.id,
    machine: row.machine,
    gatewayStatus: row.gateway_status,
    model: row.model ?? {},
    sessions: row.sessions ?? [],
    cron: row.cron ?? {},
    issues: row.issues ?? [],
    createdAt: row.created_at,
  };
}

export function mapSyncRequestRow(row: SyncRequestRow): OpsSyncRequest {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    requestedBy: row.requested_by ?? undefined,
    requestedAt: row.requested_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    error: row.error ?? undefined,
    result: row.result ?? {},
  };
}

export function mapAgentRow(row: AgentRow): OpsAgent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    provider: row.provider ?? undefined,
    runtime: row.runtime,
    model: row.model ?? undefined,
    status: row.status,
    permissions: row.permissions ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAgentRunRow(row: AgentRunRow): OpsAgentRun {
  return {
    id: row.id,
    agentId: row.agent_id,
    projectId: row.project_id ?? undefined,
    taskId: row.task_id ?? undefined,
    status: row.status,
    prompt: row.prompt,
    scope: row.scope ?? {},
    resultSummary: row.result_summary ?? undefined,
    changedFiles: row.changed_files ?? [],
    verification: row.verification ?? {},
    worklogId: row.worklog_id ?? undefined,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    error: row.error ?? undefined,
  };
}

export function mapAiReviewRow(row: AiReviewRow): OpsAiReview {
  return {
    id: row.id,
    projectId: row.project_id,
    repo: row.repo ?? undefined,
    category: row.category,
    agentId: row.agent_id ?? undefined,
    severity: row.severity,
    title: row.title,
    comment: row.comment,
    recommendation: row.recommendation ?? undefined,
    evidence: row.evidence ?? {},
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseJsonArray(raw?: string) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function parseResolvedRoots(raw?: string): OpsConsoleData["dataSource"]["resolvedRoots"] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is { label: string; path: string } => Boolean(item && typeof item.label === "string" && typeof item.path === "string"))
      : [];
  } catch {
    return [];
  }
}
