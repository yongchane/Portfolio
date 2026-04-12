import "server-only";

import { getOpsDataMode, getSupabaseAdminClient, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import {
  buildSupabaseSourceHealth,
  mapNoteRow,
  mapProjectRow,
  mapTaskRow,
  mapWorklogRow,
  parseJsonArray,
  parseResolvedRoots,
  type SupabaseOpsConsoleData,
  type SyncRunRow,
  type SyncStateRow,
  type NoteRow,
  type ProjectRow,
  type TaskRow,
  type WorklogRow,
} from "@/lib/ops/adapters/supabase";

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

  const [projectsResult, tasksResult, notesResult, worklogsResult, syncStateResult, syncRunResult] = await Promise.all([
    client.from("ops_projects").select("*").order("name", { ascending: true }),
    client.from("ops_tasks").select("*").order("updated_at", { ascending: false }),
    client.from("ops_notes").select("*").order("updated_at", { ascending: false }),
    client.from("ops_worklogs").select("*").order("updated_at", { ascending: false }),
    client.from("ops_sync_state").select("key,value,updated_at").in("key", ["generated_at", "workspace_root", "notes_roots", "resolved_roots", "notes_count", "worklogs_count", "worklogs_updated_at"]),
    client.from("ops_sync_runs").select("status,message,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const { data: projects, error: projectsError } = projectsResult;
  const { data: tasks, error: tasksError } = tasksResult;
  const { data: notes, error: notesError } = notesResult;
  const { data: worklogs, error: worklogsError } = worklogsResult;
  const { data: syncState, error: syncStateError } = syncStateResult;
  const { data: latestSyncRun, error: syncRunError } = syncRunResult;

  if (projectsError || tasksError || notesError || worklogsError || syncStateError || syncRunError) {
    throw new Error([
      projectsError?.message,
      tasksError?.message,
      notesError?.message,
      worklogsError?.message,
      syncStateError?.message,
      syncRunError?.message,
    ].filter(Boolean).join(" | "));
  }

  const state = new Map((syncState as SyncStateRow[] | null | undefined)?.map((row) => [row.key, row.value ?? ""]));

  return {
    projects: ((projects ?? []) as ProjectRow[]).map(mapProjectRow),
    tasks: ((tasks ?? []) as TaskRow[]).map(mapTaskRow),
    notes: ((notes ?? []) as NoteRow[]).map(mapNoteRow),
    worklogs: ((worklogs ?? []) as WorklogRow[]).map(mapWorklogRow),
    dataSource: {
      mode: "supabase",
      generatedAt: state.get("generated_at") || new Date().toISOString(),
      workspaceRoot: state.get("workspace_root") || undefined,
      notesRoots: parseJsonArray(state.get("notes_roots")),
      resolvedRoots: parseResolvedRoots(state.get("resolved_roots")),
      notesCount: Number(state.get("notes_count") || notes?.length || 0),
      sourceHealth: {
        ...buildSupabaseSourceHealth({
          configured: diagnostics.configured,
          available: diagnostics.available,
          mode,
          latestSyncRun: latestSyncRun as SyncRunRow | null | undefined,
        }),
        worklogsCount: Number(state.get("worklogs_count") || worklogs?.length || 0),
        worklogsUpdatedAt: state.get("worklogs_updated_at") || ((worklogs?.[0] as WorklogRow | undefined)?.updated_at ?? undefined),
      },
    },
  };
}
