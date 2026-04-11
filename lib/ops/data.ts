import { getNotesSourceData } from "@/lib/ops/notes-source";
import { getSupabaseOpsConsoleData } from "@/lib/ops/supabase-data";
import { getOpsDataMode, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import { opsGitHubCache, opsProjects, opsTasks } from "@/lib/ops/sources/static";
import type { OpsConsoleData, OpsSourceHealth } from "@/lib/ops/types";
import { buildVaultSummary } from "@/lib/ops/vault";

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  const [supabaseData, diagnostics] = await Promise.all([
    getSupabaseOpsConsoleData(),
    getSupabaseOpsDiagnostics(),
  ]);

  if (supabaseData) {
    return {
      ...supabaseData,
      github: opsGitHubCache,
      vault: buildVaultSummary(supabaseData.notes),
      dataSource: {
        ...supabaseData.dataSource,
        sourceHealth: {
          ...supabaseData.dataSource.sourceHealth,
          supabaseConfigured: diagnostics.configured,
          supabaseReachable: diagnostics.available,
        },
      },
    };
  }

  const notesSource = await getNotesSourceData();
  const preferredMode = getOpsDataMode();
  const sourceHealth: OpsSourceHealth = {
    supabaseConfigured: diagnostics.configured,
    supabaseReachable: diagnostics.available,
    activeMode: notesSource.mode,
    preferredMode,
    notesMode: notesSource.mode,
    lastSyncStatus: diagnostics.available ? "succeeded" : undefined,
    lastSyncMessage: diagnostics.configured
      ? (diagnostics.available ? "Supabase configured but inactive for current request." : "Supabase env exists but ops tables are not reachable yet.")
      : "Supabase env not configured. Using local/export notes path.",
  };

  return {
    projects: opsProjects,
    tasks: opsTasks,
    notes: notesSource.notes,
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
