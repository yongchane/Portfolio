import projectsData from "@/data/ops/projects.json";
import tasksData from "@/data/ops/tasks.json";
import { getNotesSourceData } from "@/lib/ops/notes-source";
import type { OpsConsoleData, Project, Task } from "@/lib/ops/types";

const projects = projectsData as Project[];
const tasks = tasksData as Task[];

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  const notesSource = await getNotesSourceData();

  return {
    projects,
    tasks,
    notes: notesSource.notes,
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
