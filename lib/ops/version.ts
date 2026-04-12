import type { OpsConsoleData, OpsVersionSnapshot } from "@/lib/ops/types";

export function buildOpsVersionSnapshot(data: OpsConsoleData): OpsVersionSnapshot {
  const sourceHealth = data.dataSource.sourceHealth;
  const signature = [
    data.dataSource.mode,
    data.dataSource.generatedAt,
    data.dataSource.notesCount,
    data.projects.length,
    data.tasks.length,
    data.worklogs.length,
    sourceHealth.preferredMode,
    sourceHealth.activeMode,
    sourceHealth.supabaseConfigured ? "configured" : "not-configured",
    sourceHealth.supabaseReachable ? "reachable" : "unreachable",
    sourceHealth.lastSyncStatus ?? "unknown",
    sourceHealth.lastSyncAt ?? "no-sync-at",
    sourceHealth.lastSyncMessage ?? "no-sync-message",
    sourceHealth.automation?.mode ?? "manual",
    sourceHealth.automation?.state ?? "manual",
    sourceHealth.automation?.heartbeatAt ?? "no-heartbeat",
    sourceHealth.automation?.lastRunStatus ?? "no-run-status",
    sourceHealth.automation?.lastRunFinishedAt ?? "no-run-finished-at",
  ].join("::");

  return {
    mode: data.dataSource.mode,
    generatedAt: data.dataSource.generatedAt,
    notesCount: data.dataSource.notesCount,
    projectsCount: data.projects.length,
    tasksCount: data.tasks.length,
    worklogsCount: data.worklogs.length,
    workspaceRoot: data.dataSource.workspaceRoot,
    notesRoots: data.dataSource.notesRoots,
    resolvedRoots: data.dataSource.resolvedRoots,
    sourceHealth,
    signature,
  };
}
