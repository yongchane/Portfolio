import "server-only";

import { getOpsDataMode, getSupabaseAdminClient, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import type {
  NoteItem,
  OpsConsoleData,
  OpsSourceHealth,
  Project,
  ProjectAdminSurface,
  ProjectChecklistItem,
  ProjectSectorProgress,
  Task,
} from "@/lib/ops/types";

type SupabaseOpsConsoleData = Omit<OpsConsoleData, "github" | "vault">;

type SyncStateRow = {
  key: string;
  value: string | null;
  updated_at: string;
};

type SyncRunRow = {
  status: "started" | "succeeded" | "failed";
  message: string | null;
  created_at: string;
};

type ProjectRow = {
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

type TaskRow = {
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

type NoteRow = {
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

export async function getSupabaseOpsConsoleData(): Promise<SupabaseOpsConsoleData | null> {
  const mode = getOpsDataMode();
  if (mode === "local") return null;

  const client = getSupabaseAdminClient();
  const diagnostics = await getSupabaseOpsDiagnostics();
  if (!client) {
    return null;
  }

  if (!diagnostics.available) {
    if (mode === "supabase") {
      throw new Error("Supabase ops tables are not available. Run the SQL bootstrap before forcing PORTFOLIO_OPS_DATA_MODE=supabase.");
    }
    return null;
  }

  const [projectsResult, tasksResult, notesResult, syncStateResult, syncRunResult] = await Promise.all([
    client.from("ops_projects").select("*").order("name", { ascending: true }),
    client.from("ops_tasks").select("*").order("updated_at", { ascending: false }),
    client.from("ops_notes").select("*").order("updated_at", { ascending: false }),
    client.from("ops_sync_state").select("key,value,updated_at").in("key", ["generated_at", "workspace_root", "notes_roots", "resolved_roots", "notes_count"]),
    client.from("ops_sync_runs").select("status,message,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const { data: projects, error: projectsError } = projectsResult;
  const { data: tasks, error: tasksError } = tasksResult;
  const { data: notes, error: notesError } = notesResult;
  const { data: syncState, error: syncStateError } = syncStateResult;
  const { data: latestSyncRun, error: syncRunError } = syncRunResult;

  if (projectsError || tasksError || notesError || syncStateError || syncRunError) {
    throw new Error([
      projectsError?.message,
      tasksError?.message,
      notesError?.message,
      syncStateError?.message,
      syncRunError?.message,
    ].filter(Boolean).join(" | "));
  }

  const state = new Map((syncState as SyncStateRow[] | null | undefined)?.map((row) => [row.key, row.value ?? ""]));
  const sourceHealth: OpsSourceHealth = {
    supabaseConfigured: diagnostics.configured,
    supabaseReachable: diagnostics.available,
    activeMode: "supabase",
    preferredMode: mode,
    notesMode: "supabase",
    lastSyncStatus: (latestSyncRun as SyncRunRow | null | undefined)?.status,
    lastSyncMessage: (latestSyncRun as SyncRunRow | null | undefined)?.message ?? undefined,
    lastSyncAt: (latestSyncRun as SyncRunRow | null | undefined)?.created_at,
  };

  return {
    projects: ((projects ?? []) as ProjectRow[]).map(mapProjectRow),
    tasks: ((tasks ?? []) as TaskRow[]).map(mapTaskRow),
    notes: ((notes ?? []) as NoteRow[]).map(mapNoteRow),
    dataSource: {
      mode: "supabase",
      generatedAt: state.get("generated_at") || new Date().toISOString(),
      workspaceRoot: state.get("workspace_root") || undefined,
      notesRoots: parseJsonArray(state.get("notes_roots")),
      resolvedRoots: parseResolvedRoots(state.get("resolved_roots")),
      notesCount: Number(state.get("notes_count") || notes?.length || 0),
      sourceHealth,
    },
  };
}

function mapProjectRow(row: ProjectRow): Project {
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

function mapTaskRow(row: TaskRow): Task {
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

function mapNoteRow(row: NoteRow): NoteItem {
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

function parseJsonArray(raw?: string) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseResolvedRoots(raw?: string): OpsConsoleData["dataSource"]["resolvedRoots"] {
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
