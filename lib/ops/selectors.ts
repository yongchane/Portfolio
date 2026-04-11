import type {
  GitHubProjectBoardSnapshot,
  GitHubRepoSnapshot,
  NoteItem,
  OpsConsoleData,
  Project,
  Task,
} from "@/lib/ops/types";

export type OpsSummary = {
  totalProjects: number;
  activeTasks: number;
  verifyingTasks: number;
  notesCount: number;
  githubRepos: number;
  githubBoards: number;
  mappedNotes: number;
  orphanNotes: number;
};

export function createNotesById(notes: NoteItem[]) {
  return new Map(notes.map((note) => [note.id, note]));
}

export function createGithubReposByName(data: OpsConsoleData) {
  return new Map(data.github.repoSnapshots.map((repo) => [repo.repo, repo]));
}

export function createProjectBoardsByOwner(data: OpsConsoleData) {
  const map = new Map<string, GitHubProjectBoardSnapshot[]>();
  for (const board of data.github.projectBoards) {
    const list = map.get(board.owner) || [];
    list.push(board);
    map.set(board.owner, list);
  }
  return map;
}

export function filterNotes(notes: NoteItem[], noteQuery: string) {
  const query = noteQuery.trim().toLowerCase();
  if (!query) return notes;

  return notes.filter((note) => {
    const haystack = [note.title, note.summary, note.path, note.project, note.tags.join(" "), note.headings.join(" "), note.rawExcerpt]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function buildOpsSummary(data: OpsConsoleData): OpsSummary {
  return {
    totalProjects: data.projects.length,
    activeTasks: data.tasks.filter((task) => task.status === "doing").length,
    verifyingTasks: data.tasks.filter((task) => task.status === "verifying").length,
    notesCount: data.notes.length,
    githubRepos: data.github.repoSnapshots.length,
    githubBoards: data.github.projectBoards.length,
    mappedNotes: data.vault.projectMappedCount,
    orphanNotes: data.vault.orphanNoteIds.length,
  };
}

export function getAttentionTasks(tasks: Task[]) {
  return tasks
    .filter((task) => task.status === "blocked" || task.status === "verifying" || (task.needsDecision?.length ?? 0) > 0)
    .slice(0, 4);
}

export function getSelectedProject(data: OpsConsoleData, selectedProjectId: string) {
  return data.projects.find((item) => item.id === selectedProjectId) || data.projects[0];
}

export function getProjectTasks(tasks: Task[], projectId?: string) {
  return tasks.filter((task) => task.projectId === projectId);
}

export function getSelectedRepo(project: Project | undefined, githubReposByName: Map<string, GitHubRepoSnapshot>) {
  return project?.repo ? githubReposByName.get(project.repo) : undefined;
}

export function getProjectBoardsForRepo(repo: GitHubRepoSnapshot | undefined, projectBoardsByOwner: Map<string, GitHubProjectBoardSnapshot[]>) {
  return repo ? projectBoardsByOwner.get(repo.owner) || [] : [];
}

export function getProjectReleases(data: OpsConsoleData, repo?: string) {
  if (!repo) return [];
  return data.github.releases.filter((release) => release.repo === repo).slice(0, 4);
}

export function getSelectedProjectNotes(notes: NoteItem[], project: Project | undefined) {
  if (!project) return [];
  return notes.filter((note) => note.project === project.name || note.project === project.repo || note.path.toLowerCase().includes(project.name.toLowerCase()));
}

export function createVaultLinksByNoteId(data: OpsConsoleData) {
  return new Map(data.vault.links.map((entry) => [entry.noteId, entry]));
}

export function getProjectRepoHealth(selectedProject: Project | undefined, selectedRepo: GitHubRepoSnapshot | undefined, selectedProjectReleases: ReturnType<typeof getProjectReleases>) {
  if (!selectedRepo) return null;
  const issuePressure = (selectedRepo.openIssuesCount ?? 0) + (selectedRepo.openPullRequestsCount ?? 0);
  const pushedAt = selectedRepo.pushedAt ? new Date(selectedRepo.pushedAt).getTime() : 0;
  const daysSincePush = pushedAt ? Math.floor((Date.now() - pushedAt) / (1000 * 60 * 60 * 24)) : null;
  const branchAligned = !selectedProject?.branch || selectedProject.branch === selectedRepo.defaultBranch;
  const score = Math.max(0, 100 - issuePressure * 8 - (daysSincePush && daysSincePush > 14 ? Math.min(35, daysSincePush - 14) : 0) - (branchAligned ? 0 : 12));

  return {
    score,
    issuePressure,
    daysSincePush,
    branchAligned,
    releaseCount: selectedProjectReleases.length,
  };
}

export function getReleaseProjects(data: OpsConsoleData, githubReposByName: Map<string, GitHubRepoSnapshot>) {
  return data.projects.filter((project) => project.repo).map((project) => {
    const repo = project.repo ? githubReposByName.get(project.repo) : undefined;
    const releases = data.github.releases.filter((release) => release.repo === project.repo);
    const latestRelease = releases[0];
    const pushedAt = repo?.pushedAt ? new Date(repo.pushedAt).getTime() : 0;
    const daysSincePush = pushedAt ? Math.floor((Date.now() - pushedAt) / (1000 * 60 * 60 * 24)) : null;
    const branchAligned = !project.branch || !repo || project.branch === repo.defaultBranch;

    return {
      project,
      repo,
      releases,
      latestRelease,
      daysSincePush,
      branchAligned,
    };
  });
}
