export type TaskStatus = "planned" | "doing" | "verifying" | "shipped" | "blocked";
export type ProjectStage = "idea" | "planning" | "building" | "verifying" | "live";
export type NoteType = "daily-chat-log" | "project-ops" | "aeyong-debug" | "weekly-review" | "reference";

export type TaskCategory = "planning" | "build" | "deploy" | "ops" | "docs";
export type ProgressState = "todo" | "doing" | "done" | "blocked";

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

export type ProjectSectorProgress = {
  id: string;
  label: string;
  status: ProgressState;
  summary: string;
};

export type ProjectChecklistItem = {
  id: string;
  label: string;
  status: ProgressState;
  note?: string;
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
  sectors?: ProjectSectorProgress[];
  checklist?: ProjectChecklistItem[];
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

export type GitHubRepoSnapshot = {
  repo: string;
  name: string;
  owner: string;
  url: string;
  description: string;
  visibility: string;
  defaultBranch: string;
  pushedAt?: string;
  updatedAt?: string;
  stargazerCount?: number;
  forkCount?: number;
  openIssuesCount?: number;
  openPullRequestsCount?: number;
  watchersCount?: number;
  primaryLanguage?: string;
  topics?: string[];
  hasProjectsEnabled?: boolean;
  isArchived?: boolean;
};

export type GitHubReleaseSnapshot = {
  id: string;
  repo: string;
  name: string;
  tagName: string;
  url: string;
  publishedAt?: string;
  isDraft: boolean;
  isPrerelease: boolean;
  description?: string;
};

export type GitHubProjectBoardSnapshot = {
  id: string;
  owner: string;
  ownerType: "user" | "organization";
  title: string;
  number: number;
  url: string;
  updatedAt?: string;
  closed: boolean;
  itemCount?: number;
  fieldNames?: string[];
};

export type GitHubCache = {
  generatedAt: string;
  mode: "live" | "fallback";
  account?: string;
  repoSnapshots: GitHubRepoSnapshot[];
  releases: GitHubReleaseSnapshot[];
  projectBoards: GitHubProjectBoardSnapshot[];
  warnings?: string[];
};

export type OpsConsoleData = {
  projects: Project[];
  tasks: Task[];
  notes: NoteItem[];
  github: GitHubCache;
  dataSource: {
    mode: "live" | "export" | "supabase";
    generatedAt: string;
    workspaceRoot?: string;
    notesRoots: string[];
    resolvedRoots: ExportSourceRoot[];
    notesCount: number;
  };
};
