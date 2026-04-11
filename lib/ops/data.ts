import projectsData from "@/data/ops/projects.json";
import tasksData from "@/data/ops/tasks.json";
import notesExport from "@/data/ops/notes-export.json";
import type { NoteItem, OpsConsoleData, Project, Task } from "@/lib/ops/types";

const projects = projectsData as Project[];
const tasks = tasksData as Task[];
const exportedNotes = notesExport.notes as NoteItem[];

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  return {
    projects,
    tasks,
    notes: exportedNotes,
    dataSource: {
      mode: "export",
      generatedAt: notesExport.generatedAt,
      workspaceRoot: notesExport.source.workspaceRoot,
      notesRoots: notesExport.source.roots,
      resolvedRoots: notesExport.source.resolvedRoots,
      notesCount: exportedNotes.length,
    },
  };
}
