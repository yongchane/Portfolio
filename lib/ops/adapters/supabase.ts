import type {
  NoteItem,
  OpsArtifactRecord,
  OpsConsoleData,
  OpsSourceHealth,
  Project,
  ProjectAdminSurface,
  ProjectChecklistItem,
  ProjectSectorProgress,
  Task,
  WorklogRecord,
} from "@/lib/ops/types";

export type SupabaseOpsConsoleData = Omit<OpsConsoleData, "github" | "vault">;

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

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    stage: row.stage,
    summary: row.summary,
    repo: row.repo ?? undefined,
    branch: row.branch ?? undefined,
    deployUrl: row.deploy_url ?? undefined,
    docs: row.docs ?? [],
    sectors: row.sectors ?? [],
    checklist: row.checklist ?? [],
    operatingCadence: row.operating_cadence ?? [],
    adminSurfaces: row.admin_surfaces ?? [],
    vaultViews: row.vault_views ?? [],
    githubFocus: row.github_focus ?? [],
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
    completedWork: row.completed_work ?? [],
    nextActions: row.next_actions ?? [],
    relatedDocs: row.related_docs ?? [],
    relatedCommits: row.related_commits ?? [],
    noteIds: row.note_ids ?? [],
    needsDecision: row.needs_decision ?? [],
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
    tags: row.tags ?? [],
    updatedAt: row.updated_at,
    path: normalizedPath,
    workspaceRootLabel: row.workspace_root_label,
    folder: normalizedPath.split("/").slice(0, -1).join("/") || "(root)",
    links: row.links ?? [],
    summary: row.summary,
    highlights: row.highlights ?? [],
    headings: row.headings ?? [],
    preview: row.preview ?? [],
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
    tags: row.tags ?? [],
    highlights: row.highlights ?? [],
    decisions: row.decisions ?? [],
    blockers: row.blockers ?? [],
    nextActions: row.next_actions ?? [],
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
    tags: row.tags ?? [],
    highlights: row.highlights ?? [],
    decisions: row.decisions ?? [],
    learnings: row.learnings ?? [],
    blockers: row.blockers ?? [],
    nextActions: row.next_actions ?? [],
    linkedNoteIds: row.linked_note_ids ?? [row.note_id],
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
