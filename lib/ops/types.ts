export type TaskStatus = "planned" | "doing" | "verifying" | "shipped" | "blocked";
export type ProjectStage = "idea" | "planning" | "building" | "verifying" | "live";
export type NoteType = "daily-chat-log" | "project-ops" | "aeyong-debug" | "weekly-review" | "reference";

export type TaskCategory = "planning" | "build" | "deploy" | "ops" | "docs";

export type Task = {
  id: string;
  title: string;
  projectId: string;
  category: TaskCategory;
  status: TaskStatus;
  summary: string;
  completedWork: string[];
  nextActions: string[];
  relatedDocs?: string[];
  relatedCommits?: string[];
  noteIds?: string[];
  needsDecision?: string[];
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  stage: ProjectStage;
  summary: string;
  repo?: string;
  branch?: string;
  deployUrl?: string;
  docs?: string[];
};

export type NoteItem = {
  id: string;
  title: string;
  type: NoteType;
  project?: string;
  tags: string[];
  updatedAt: string;
  path: string;
  workspaceRootLabel: string;
  summary: string;
  highlights: string[];
  headings: string[];
  preview: string[];
  rawExcerpt: string;
};

export type ExportSourceRoot = {
  label: string;
  path: string;
};

export type OpsConsoleData = {
  projects: Project[];
  tasks: Task[];
  notes: NoteItem[];
  dataSource: {
    mode: "live" | "export" | "supabase";
    generatedAt: string;
    workspaceRoot?: string;
    notesRoots: string[];
    resolvedRoots: ExportSourceRoot[];
    notesCount: number;
  };
};
