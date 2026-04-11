import githubCacheData from "@/data/ops/github-cache.json";
import projectsData from "@/data/ops/projects.json";
import tasksData from "@/data/ops/tasks.json";
import { getNotesSourceData } from "@/lib/ops/notes-source";
import { getSupabaseOpsConsoleData } from "@/lib/ops/supabase-data";
import type { GitHubCache, OpsConsoleData, Project, Task } from "@/lib/ops/types";

const projects = projectsData as Project[];
const tasks = tasksData as Task[];
const github = githubCacheData as GitHubCache;

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  const supabaseData = await getSupabaseOpsConsoleData();
  if (supabaseData) {
    return {
      ...supabaseData,
      github,
    };
  }

  const notesSource = await getNotesSourceData();

  return {
    projects,
    tasks,
    notes: notesSource.notes,
    github,
    dataSource: {
      mode: notesSource.mode,
      generatedAt: notesSource.generatedAt,
      workspaceRoot: notesSource.workspaceRoot,
      notesRoots: notesSource.notesRoots,
      resolvedRoots: notesSource.resolvedRoots,
      notesCount: notesSource.notes.length,
    },
  };
}
