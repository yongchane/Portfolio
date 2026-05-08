import "server-only";

import {
  getOpsDataMode,
  getSupabaseAdminClient,
  getSupabaseOpsDiagnostics,
} from "@/lib/ops/supabase";
import {
  buildSupabaseSourceHealth,
  mapAgentRow,
  mapAgentRunRow,
  mapAiReviewRow,
  mapArtifactRow,
  mapHostStatusRow,
  mapNoteRow,
  mapOpenClawStatusRow,
  mapProjectRow,
  mapSyncRequestRow,
  mapTaskRow,
  mapWorkerHeartbeatRow,
  mapWorklogRow,
  parseJsonArray,
  parseResolvedRoots,
  type AgentRow,
  type AgentRunRow,
  type AiReviewRow,
  type SupabaseOpsConsoleData,
  type SyncRequestRow,
  type SyncRunRow,
  type SyncStateRow,
  type ArtifactRow,
  type HostStatusRow,
  type NoteRow,
  type OpenClawStatusRow,
  type ProjectRow,
  type TaskRow,
  type WorkerHeartbeatRow,
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
      throw new Error(
        "Supabase ops tables are not available. Run the SQL bootstrap before forcing PORTFOLIO_OPS_DATA_MODE=supabase.",
      );
    }
    return null;
  }

  const [
    projectsResult,
    tasksResult,
    notesResult,
    worklogsResult,
    artifactsResult,
    workerHeartbeatsResult,
    hostStatusesResult,
    openclawStatusesResult,
    syncRequestsResult,
    agentsResult,
    agentRunsResult,
    aiReviewsResult,
    syncStateResult,
    syncRunResult,
  ] = await Promise.all([
    client.from("ops_projects").select("*").order("name", { ascending: true }),
    client
      .from("ops_tasks")
      .select("*")
      .order("updated_at", { ascending: false }),
    client
      .from("ops_notes")
      .select("*")
      .order("updated_at", { ascending: false }),
    client
      .from("ops_worklogs")
      .select("*")
      .order("updated_at", { ascending: false }),
    client
      .from("ops_artifacts")
      .select("*")
      .order("updated_at", { ascending: false }),
    client
      .from("ops_worker_heartbeats")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(10),
    client
      .from("ops_host_status")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    client
      .from("ops_openclaw_status")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    client
      .from("ops_sync_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(20),
    client
      .from("ops_agents")
      .select("*")
      .order("name", { ascending: true }),
    client
      .from("ops_agent_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("ops_ai_reviews")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100),
    client
      .from("ops_sync_state")
      .select("key,value,updated_at")
      .in("key", [
        "generated_at",
        "workspace_root",
        "notes_roots",
        "resolved_roots",
        "notes_count",
        "worklogs_count",
        "worklogs_updated_at",
        "artifacts_count",
        "decisions_count",
        "learnings_count",
        "artifacts_updated_at",
      ]),
    client
      .from("ops_sync_runs")
      .select("status,message,created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: projects, error: projectsError } = projectsResult;
  const { data: tasks, error: tasksError } = tasksResult;
  const { data: notes, error: notesError } = notesResult;
  const { data: worklogs, error: worklogsError } = worklogsResult;
  const { data: artifacts, error: artifactsError } = artifactsResult;
  const { data: workerHeartbeats, error: workerHeartbeatsError } = workerHeartbeatsResult;
  const { data: hostStatuses, error: hostStatusesError } = hostStatusesResult;
  const { data: openclawStatuses, error: openclawStatusesError } = openclawStatusesResult;
  const { data: syncRequests, error: syncRequestsError } = syncRequestsResult;
  const { data: agents, error: agentsError } = agentsResult;
  const { data: agentRuns, error: agentRunsError } = agentRunsResult;
  const { data: aiReviews, error: aiReviewsError } = aiReviewsResult;
  const { data: syncState, error: syncStateError } = syncStateResult;
  const { data: latestSyncRun, error: syncRunError } = syncRunResult;
  const latestSyncRunRow = latestSyncRun as SyncRunRow | null | undefined;

  const queryErrorMessages = [
    projectsError?.message,
    tasksError?.message,
    notesError?.message,
    worklogsError?.message,
    artifactsError?.message,
    workerHeartbeatsError?.message,
    hostStatusesError?.message,
    openclawStatusesError?.message,
    syncRequestsError?.message,
    agentsError?.message,
    agentRunsError?.message,
    aiReviewsError?.message,
    syncStateError?.message,
    syncRunError?.message,
  ].filter(Boolean);

  const state = new Map(
    (syncState as SyncStateRow[] | null | undefined)?.map((row) => [
      row.key,
      row.value ?? "",
    ]),
  );

  return {
    projects: ((projects ?? []) as ProjectRow[]).map(mapProjectRow),
    tasks: ((tasks ?? []) as TaskRow[]).map(mapTaskRow),
    notes: ((notes ?? []) as NoteRow[]).map(mapNoteRow),
    worklogs: ((worklogs ?? []) as WorklogRow[]).map(mapWorklogRow),
    artifacts: ((artifacts ?? []) as ArtifactRow[]).map(mapArtifactRow),
    workerHeartbeats: ((workerHeartbeats ?? []) as WorkerHeartbeatRow[]).map(mapWorkerHeartbeatRow),
    hostStatuses: ((hostStatuses ?? []) as HostStatusRow[]).map(mapHostStatusRow),
    openclawStatuses: ((openclawStatuses ?? []) as OpenClawStatusRow[]).map(mapOpenClawStatusRow),
    syncRequests: ((syncRequests ?? []) as SyncRequestRow[]).map(mapSyncRequestRow),
    agents: ((agents ?? []) as AgentRow[]).map(mapAgentRow),
    agentRuns: ((agentRuns ?? []) as AgentRunRow[]).map(mapAgentRunRow),
    aiReviews: ((aiReviews ?? []) as AiReviewRow[]).map(mapAiReviewRow),
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
          latestSyncRun: latestSyncRunRow,
        }),
        lastSyncMessage: queryErrorMessages.length
          ? [
              latestSyncRunRow?.message,
              `Supabase query warning: ${queryErrorMessages.join(" | ")}`,
            ]
              .filter(Boolean)
              .join(" | ")
          : (latestSyncRunRow?.message ?? undefined),
        worklogsCount: Number(
          state.get("worklogs_count") || worklogs?.length || 0,
        ),
        worklogsUpdatedAt:
          state.get("worklogs_updated_at") ||
          ((worklogs?.[0] as WorklogRow | undefined)?.updated_at ?? undefined),
        artifactsCount: Number(
          state.get("artifacts_count") || artifacts?.length || 0,
        ),
        decisionsCount: Number(
          state.get("decisions_count") ||
            (artifacts ?? []).filter(
              (row) => (row as ArtifactRow).artifact_type === "decision",
            ).length ||
            0,
        ),
        learningsCount: Number(
          state.get("learnings_count") ||
            (artifacts ?? []).filter(
              (row) => (row as ArtifactRow).artifact_type === "learning",
            ).length ||
            0,
        ),
        artifactsUpdatedAt:
          state.get("artifacts_updated_at") ||
          ((artifacts?.[0] as ArtifactRow | undefined)?.updated_at ??
            undefined),
      },
    },
  };
}
