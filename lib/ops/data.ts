import { getOpsAutomationStatus } from "@/lib/ops/automation";
import { getNotesSourceData } from "@/lib/ops/notes-source";
import { getSupabaseOpsConsoleData } from "@/lib/ops/supabase-data";
import { getOpsDataMode, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import { opsGitHubCache, opsProjects, opsTasks } from "@/lib/ops/sources/static";
import type { OpsConsoleData, OpsSourceHealth } from "@/lib/ops/types";
import { buildVaultSummary } from "@/lib/ops/vault";
import { extractArtifactRecords, summarizeArtifactCounts } from "@/lib/ops/artifacts";
import { extractWorklogRecords } from "@/lib/ops/worklog";

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  const [supabaseData, diagnostics, automation] = await Promise.all([
    getSupabaseOpsConsoleData(),
    getSupabaseOpsDiagnostics(),
    getOpsAutomationStatus(),
  ]);

  if (supabaseData) {
    return {
      ...supabaseData,
      github: opsGitHubCache,
      vault: buildVaultSummary(supabaseData.notes),
      worklogs: supabaseData.worklogs,
      artifacts: supabaseData.artifacts,
      dataSource: {
        ...supabaseData.dataSource,
        sourceHealth: {
          ...supabaseData.dataSource.sourceHealth,
          supabaseConfigured: diagnostics.configured,
          supabaseReachable: diagnostics.available,
          automation,
        },
      },
    };
  }

  const notesSource = await getNotesSourceData();
  const preferredMode = getOpsDataMode();
  const worklogs = extractWorklogRecords(notesSource.notes);
  const artifacts = extractArtifactRecords(notesSource.notes);
  const artifactCounts = summarizeArtifactCounts(artifacts);
  const sourceHealth: OpsSourceHealth = {
    supabaseConfigured: diagnostics.configured,
    supabaseReachable: diagnostics.available,
    activeMode: notesSource.mode,
    preferredMode,
    notesMode: notesSource.mode,
    lastSyncStatus: diagnostics.available ? "succeeded" : undefined,
    lastSyncMessage: diagnostics.configured
      ? (diagnostics.available ? "Supabase configured but inactive for current request." : "Supabase env exists but ops tables are not reachable yet.")
      : "Supabase env not configured. Using direct workspace-read fallback for notes.",
    worklogsCount: worklogs.length,
    worklogsUpdatedAt: worklogs[0]?.updatedAt,
    artifactsCount: artifactCounts.total,
    decisionsCount: artifactCounts.decisions,
    learningsCount: artifactCounts.learnings,
    artifactsUpdatedAt: artifacts[0]?.updatedAt,
    automation,
  };

  return {
    projects: opsProjects,
    tasks: opsTasks,
    notes: notesSource.notes,
    worklogs,
    artifacts,
    github: opsGitHubCache,
    vault: buildVaultSummary(notesSource.notes),
    dataSource: {
      mode: notesSource.mode,
      generatedAt: notesSource.generatedAt,
      workspaceRoot: notesSource.workspaceRoot,
      notesRoots: notesSource.notesRoots,
      resolvedRoots: notesSource.resolvedRoots,
      notesCount: notesSource.notes.length,
      sourceHealth,
    },
  };
}
