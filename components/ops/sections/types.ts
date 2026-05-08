import type { SectionId } from "@/components/ops/config";
import type { GitHubProjectBoardSnapshot, GitHubRepoSnapshot, NoteItem, OpsConsoleData, OpsVersionSnapshot, Project, Task } from "@/lib/ops/types";
import type { OpsSummary } from "@/lib/ops/selectors";

export type OpsSectionBaseProps = {
  data: OpsConsoleData;
  summary: OpsSummary;
  notesById: Map<string, NoteItem>;
  githubReposByName: Map<string, GitHubRepoSnapshot>;
  setSection: (section: SectionId) => void;
  setSelectedProjectId: (projectId: string) => void;
  setSelectedNoteId: (noteId: string) => void;
};

export type OverviewSectionProps = OpsSectionBaseProps & {
  attentionTasks: Task[];
  liveStatus: OpsVersionSnapshot | null;
};

export type TasksSectionProps = OpsSectionBaseProps;

export type ProjectsSectionProps = OpsSectionBaseProps & {
  selectedProject: Project;
  projectTasks: Task[];
  selectedRepo?: GitHubRepoSnapshot;
  selectedProjectBoards: GitHubProjectBoardSnapshot[];
  selectedProjectReleases: OpsConsoleData["github"]["releases"];
  selectedProjectNotes: NoteItem[];
  selectedProjectNotesCount: number;
  selectedProjectNextActions: string[];
  projectExecutionStatus: Record<Task["status"], number>;
  projectRepoHealth: {
    score: number;
    issuePressure: number;
    daysSincePush: number | null;
    branchAligned: boolean;
    releaseCount: number;
  } | null;
  vaultLinksByNoteId: Map<string, OpsConsoleData["vault"]["links"][number]>;
};

export type NotesSectionProps = OpsSectionBaseProps & {
  filteredNotes: NoteItem[];
  selectedNote?: NoteItem;
  selectedNoteId: string;
  noteQuery: string;
  setNoteQuery: (value: string) => void;
  vaultLinksByNoteId: Map<string, OpsConsoleData["vault"]["links"][number]>;
};

export type ReleasesSectionProps = OpsSectionBaseProps & {
  releaseProjects: Array<{
    project: Project;
    repo?: GitHubRepoSnapshot;
    releases: OpsConsoleData["github"]["releases"];
    latestRelease?: OpsConsoleData["github"]["releases"][number];
    daysSincePush: number | null;
    branchAligned: boolean;
  }>;
};

export type SettingsSectionProps = OpsSectionBaseProps;

export type AeyongSectionProps = OpsSectionBaseProps;

export type WorkerSectionProps = OpsSectionBaseProps;
export type MacMiniSectionProps = OpsSectionBaseProps;
