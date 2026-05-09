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

export type ProjectAdminSurface = {
  id: string;
  label: string;
  kind: "console" | "db" | "deploy" | "docs" | "github" | "automation";
  status: ProgressState;
  summary: string;
  href?: string;
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
  operatingCadence?: string[];
  adminSurfaces?: ProjectAdminSurface[];
  vaultViews?: string[];
  githubFocus?: string[];
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
  folder: string;
  frontmatter?: Record<string, string>;
  links: string[];
  summary: string;
  highlights: string[];
  headings: string[];
  preview: string[];
  rawExcerpt: string;
};

export type VaultFolderStat = {
  folder: string;
  count: number;
  noteIds: string[];
};

export type VaultTagStat = {
  tag: string;
  count: number;
};

export type VaultLinkStat = {
  noteId: string;
  title: string;
  linksTo: string[];
  linkedBy: string[];
};

export type VaultSummary = {
  notesCount: number;
  templatesCount: number;
  rootCount: number;
  projectMappedCount: number;
  orphanNoteIds: string[];
  folders: VaultFolderStat[];
  tags: VaultTagStat[];
  links: VaultLinkStat[];
};

export type ExportSourceRoot = {
  label: string;
  path: string;
};

export type WorklogStatus = "planned" | "running" | "completed" | "blocked";

export type WorklogRecord = {
  id: string;
  noteId: string;
  title: string;
  path: string;
  project?: string;
  actor: string;
  repo?: string;
  branch?: string;
  status: WorklogStatus;
  summary: string;
  sourceMachine?: string;
  sessionId?: string;
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
  tags: string[];
  highlights: string[];
  decisions: string[];
  blockers: string[];
  nextActions: string[];
};

export type OpsArtifactType = "worklog" | "decision" | "learning";

export type OpsArtifactRecord = {
  id: string;
  noteId: string;
  title: string;
  artifactType: OpsArtifactType;
  project?: string;
  path: string;
  summary: string;
  actor?: string;
  sourceMachine?: string;
  repo?: string;
  branch?: string;
  status?: WorklogStatus;
  tags: string[];
  highlights: string[];
  decisions: string[];
  learnings: string[];
  blockers: string[];
  nextActions: string[];
  linkedNoteIds: string[];
  updatedAt: string;
};

export type OpsAutomationState = "manual" | "starting" | "running" | "syncing" | "idle" | "stopped" | "error";

export type OpsAutomationStatus = {
  mode: "manual" | "watch" | "cron" | "launchd";
  state: OpsAutomationState;
  updatedAt?: string;
  heartbeatAt?: string;
  startedAt?: string;
  stoppedAt?: string;
  pid?: number;
  watchMode?: boolean;
  watchTargets?: string[];
  watchTargetsCount?: number;
  queuedReason?: string;
  restartCount?: number;
  lastRunStartedAt?: string;
  lastRunFinishedAt?: string;
  lastRunStatus?: "started" | "succeeded" | "failed";
  lastRunReason?: string;
  lastRunMessage?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  watchTargetsSummary?: string;
  nextSuggestedAction?: string;
  statusPath?: string;
  logPath?: string;
  lockPath?: string;
};


export type OpsWorkerStatus = "online" | "offline" | "error" | "stale";
export type OpsSyncRequestType = "worklogs" | "github" | "openclaw" | "host" | "all";
export type OpsSyncRequestStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type OpsAgentRole = "manager" | "qa" | "security" | "uiux" | "docs" | "github" | "coding";
export type OpsAgentRuntime = "openclaw" | "acp" | "codex" | "manual";
export type OpsAgentStatus = "active" | "inactive" | "error";
export type OpsAgentRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "needs_approval";
export type OpsAiReviewCategory = "qa" | "security" | "feature" | "update" | "uiux";
export type OpsAiReviewSeverity = "low" | "medium" | "high" | "info";
export type OpsAiReviewStatus = "open" | "resolved" | "ignored";

export type OpsWorkerHeartbeat = {
  id: string;
  workerName: string;
  machine: string;
  status: OpsWorkerStatus;
  version?: string;
  lastSeenAt: string;
  payload: Record<string, unknown>;
};

export type OpsHostStatus = {
  id: string;
  machine: string;
  cpu: Record<string, unknown>;
  memory: Record<string, unknown>;
  disk: Record<string, unknown>;
  uptimeSeconds?: number;
  network: Record<string, unknown>;
  processes: unknown[];
  createdAt: string;
};

export type OpsOpenClawPushedStatus = {
  id: string;
  machine: string;
  gatewayStatus: string;
  model: Record<string, unknown>;
  sessions: unknown[];
  cron: Record<string, unknown>;
  issues: unknown[];
  createdAt: string;
};

export type OpsSyncRequest = {
  id: string;
  type: OpsSyncRequestType;
  status: OpsSyncRequestStatus;
  requestedBy?: string;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result: Record<string, unknown>;
};

export type OpsAgent = {
  id: string;
  name: string;
  role: OpsAgentRole;
  provider?: string;
  runtime: OpsAgentRuntime;
  model?: string;
  status: OpsAgentStatus;
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type OpsAgentRun = {
  id: string;
  agentId: string;
  projectId?: string;
  taskId?: string;
  status: OpsAgentRunStatus;
  prompt: string;
  scope: Record<string, unknown>;
  resultSummary?: string;
  changedFiles: string[];
  verification: Record<string, unknown>;
  worklogId?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type OpsAiReview = {
  id: string;
  projectId: string;
  repo?: string;
  category: OpsAiReviewCategory;
  agentId?: string;
  severity: OpsAiReviewSeverity;
  title: string;
  comment: string;
  recommendation?: string;
  evidence: Record<string, unknown>;
  status: OpsAiReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type OpsSourceHealth = {
  supabaseConfigured: boolean;
  supabaseReachable: boolean;
  activeMode: "live" | "export" | "supabase";
  preferredMode: "auto" | "local" | "supabase";
  notesMode: "live" | "export" | "supabase";
  lastSyncStatus?: "started" | "succeeded" | "failed";
  lastSyncMessage?: string;
  lastSyncAt?: string;
  worklogsCount?: number;
  worklogsUpdatedAt?: string;
  artifactsCount?: number;
  decisionsCount?: number;
  learningsCount?: number;
  artifactsUpdatedAt?: string;
  automation?: OpsAutomationStatus;
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

export type GitHubWorkflowRunSnapshot = {
  id: string;
  repo: string;
  name: string;
  status: string;
  conclusion?: string;
  branch?: string;
  event?: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GitHubSecurityAlertSnapshot = {
  id: string;
  repo: string;
  kind: "dependabot" | "code-scanning" | "secret-scanning";
  severity?: string;
  state: string;
  title: string;
  url?: string;
  createdAt?: string;
};

export type GitHubCache = {
  generatedAt: string;
  mode: "live" | "fallback";
  account?: string;
  repoSnapshots: GitHubRepoSnapshot[];
  releases: GitHubReleaseSnapshot[];
  projectBoards: GitHubProjectBoardSnapshot[];
  workflowRuns?: GitHubWorkflowRunSnapshot[];
  securityAlerts?: GitHubSecurityAlertSnapshot[];
  warnings?: string[];
};

export type OpsVersionSnapshot = {
  mode: "live" | "export" | "supabase";
  generatedAt: string;
  notesCount: number;
  projectsCount: number;
  tasksCount: number;
  worklogsCount: number;
  workspaceRoot?: string;
  notesRoots: string[];
  resolvedRoots: ExportSourceRoot[];
  sourceHealth: OpsSourceHealth;
  signature: string;
};

export type OpenClawModelSnapshot = {
  primary?: string;
  fallback: string[];
  allowed: string[];
  gpt55Configured: boolean;
  configuredAgents: Array<{ id: string; model?: string }>;
  openaiCodexModelCount?: number;
};

export type OpenClawPreferenceSnapshot = {
  checklistFirst: boolean;
  conciseKeywordReport: boolean;
  preferredAssistantName?: string;
  preferredModelMention?: string;
  staleModelMention: boolean;
};

export type OpenClawFileSnapshot = {
  id: string;
  label: string;
  kind: "policy" | "identity" | "profile" | "memory" | "automation" | "tooling";
  path: string;
  exists: boolean;
  updatedAt?: string;
  bytes?: number;
  lineCount?: number;
  summary?: string;
};

export type OpenClawOperatingIssue = {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  recommendation: string;
};

export type OpenClawDiagnostics = {
  generatedAt: string;
  host: string;
  workspaceRoot: string;
  configPath: string;
  model: OpenClawModelSnapshot;
  preferences: OpenClawPreferenceSnapshot;
  files: OpenClawFileSnapshot[];
  issues: OpenClawOperatingIssue[];
  health: {
    score: number;
    high: number;
    medium: number;
    low: number;
  };
};

export type OpsConsoleData = {
  projects: Project[];
  tasks: Task[];
  notes: NoteItem[];
  worklogs: WorklogRecord[];
  artifacts: OpsArtifactRecord[];
  github: GitHubCache;
  vault: VaultSummary;
  openclaw: OpenClawDiagnostics;
  workerHeartbeats: OpsWorkerHeartbeat[];
  hostStatuses: OpsHostStatus[];
  openclawStatuses: OpsOpenClawPushedStatus[];
  syncRequests: OpsSyncRequest[];
  agents: OpsAgent[];
  agentRuns: OpsAgentRun[];
  aiReviews: OpsAiReview[];
  dataSource: {
    mode: "live" | "export" | "supabase";
    generatedAt: string;
    workspaceRoot?: string;
    notesRoots: string[];
    resolvedRoots: ExportSourceRoot[];
    notesCount: number;
    sourceHealth: OpsSourceHealth;
  };
};

export type OpsProjectCommandStatus = "healthy" | "attention" | "risk";
export type OpsProjectActionSeverity = "critical" | "warning" | "info";
export type OpsProjectActionCategory =
  | "blocked"
  | "verification"
  | "review"
  | "security"
  | "ci"
  | "docs"
  | "release"
  | "setup";

export type OpsProjectActionItem = {
  id: string;
  severity: OpsProjectActionSeverity;
  category: OpsProjectActionCategory;
  title: string;
  reason: string;
  source: {
    table: string;
    id?: string;
  };
  cta: string;
  createdAt?: string;
};

export type OpsProjectRailItem = {
  projectId: string;
  name: string;
  stage: ProjectStage;
  repo?: string;
  status: OpsProjectCommandStatus;
  score: number;
  counts: {
    blockedTasks: number;
    verifyingTasks: number;
    openReviews: number;
    highReviews: number;
    linkedNotes: number;
  };
};

export type OpsProjectCommand = {
  status: OpsProjectCommandStatus;
  title: string;
  summary: string;
  score: number;
  primaryAction?: {
    label: string;
    actionId: string;
  };
  stats: {
    tasks: number;
    blockedTasks: number;
    verifyingTasks: number;
    openReviews: number;
    missingReviewCategories: number;
    linkedNotes: number;
    failedRuns: number;
    securityAlerts: number;
  };
};

export type OpsProjectAiReviewColumn = {
  category: OpsAiReviewCategory;
  label: string;
  helper: string;
  status: "covered" | "missing" | "risk";
  highestSeverity: OpsAiReviewSeverity | "none";
  counts: {
    open: number;
    resolved: number;
    ignored: number;
    total: number;
  };
  reviews: OpsAiReview[];
  emptyMessage: string;
};

export type OpsProjectEvidence = {
  execution: {
    tasks: Task[];
    nextActions: string[];
    checklist: ProjectChecklistItem[];
    sectors: ProjectSectorProgress[];
    operatingCadence: string[];
    adminSurfaces: ProjectAdminSurface[];
  };
  docs: {
    linkedNotes: NoteItem[];
    linkedNotesCount: number;
    missing: boolean;
  };
  github: {
    repo?: GitHubRepoSnapshot;
    boards: GitHubProjectBoardSnapshot[];
    releases: OpsConsoleData["github"]["releases"];
    workflowRuns: NonNullable<OpsConsoleData["github"]["workflowRuns"]>;
    failedWorkflowRuns: NonNullable<OpsConsoleData["github"]["workflowRuns"]>;
    securityAlerts: NonNullable<OpsConsoleData["github"]["securityAlerts"]>;
    boardScopeWarning?: string;
  };
};

export type OpsProjectDataTrust = {
  activeSource: OpsConsoleData["dataSource"]["mode"];
  generatedAt: string;
  counts: {
    projects: number;
    tasks: number;
    aiReviews: number;
    linkedNotes: number;
    workflowRuns: number;
    securityAlerts: number;
  };
  warnings: string[];
};

export type OpsProjectModel = {
  generatedAt: string;
  selectedProject: Project;
  rail: OpsProjectRailItem[];
  command: OpsProjectCommand;
  actions: OpsProjectActionItem[];
  aiReviewBoard: OpsProjectAiReviewColumn[];
  evidence: OpsProjectEvidence;
  dataTrust: OpsProjectDataTrust;
};

export type OpsOverviewSeverity = "critical" | "warning" | "info" | "healthy" | "empty";
export type OpsOverviewCommandStatus = "healthy" | "attention" | "risk";
export type OpsOverviewFreshness = "fresh" | "stale" | "unknown";

export type OpsOverviewTargetSection =
  | "overview"
  | "projects"
  | "tasks"
  | "notes"
  | "aeyong"
  | "worker"
  | "macmini"
  | "releases"
  | "settings";

export type OpsOverviewCommand = {
  status: OpsOverviewCommandStatus;
  title: string;
  summary: string;
  primaryAction?: {
    label: string;
    targetSection: OpsOverviewTargetSection;
    targetId?: string;
  };
  stats: {
    activeTasks: number;
    verifyingTasks: number;
    blockedTasks: number;
    reviewNeededProjects: number;
    staleSystems: number;
  };
};

export type OpsOverviewActionCategory =
  | "approval"
  | "verification"
  | "blocked"
  | "recovery"
  | "review"
  | "cms"
  | "sync";

export type OpsOverviewActionItem = {
  id: string;
  severity: Exclude<OpsOverviewSeverity, "healthy" | "empty">;
  category: OpsOverviewActionCategory;
  title: string;
  reason: string;
  source: {
    table: string;
    id?: string;
  };
  target: {
    section: OpsOverviewTargetSection;
    id?: string;
  };
  cta: string;
  createdAt?: string;
};

export type OpsOverviewProjectHealth = {
  projectId: string;
  name: string;
  stage: ProjectStage;
  health: "healthy" | "attention" | "risk";
  score: number;
  diagnosis: string;
  nextAction: string;
  counts: {
    tasks: number;
    activeTasks: number;
    verifyingTasks: number;
    blockedTasks: number;
    notes: number;
    aiReviews: number;
  };
  signals: {
    docsCoverage: "good" | "partial" | "missing";
    aiReviewCoverage: "good" | "missing";
    githubRisk: "clean" | "attention" | "unknown";
    releaseState: "ready" | "missing" | "unknown";
  };
  links: {
    repo?: string;
    deployUrl?: string;
  };
};

export type OpsOverviewHealthItem = {
  status: "online" | "stale" | "offline" | "warning" | "unknown";
  label: string;
  detail: string;
  lastSeenAt?: string;
  targetSection: OpsOverviewTargetSection;
};

export type OpsOverviewSystemHealth = {
  worker: OpsOverviewHealthItem;
  macMini: OpsOverviewHealthItem;
  openclaw: OpsOverviewHealthItem;
  supabase: OpsOverviewHealthItem;
  github: OpsOverviewHealthItem;
};

export type OpsOverviewCmsBucketStatus = {
  id: string;
  label: string;
  count: number;
  status: "healthy" | "empty" | "attention";
};

export type OpsOverviewKnowledgeSnapshot = {
  coverage: {
    totalNotes: number;
    projectLinkedNotes: number;
    orphanNotes: number;
    worklogs: number;
    artifacts: number;
  };
  buckets: OpsOverviewCmsBucketStatus[];
  recentNotes: {
    id: string;
    title: string;
    type: NoteType;
    project?: string;
    updatedAt: string;
  }[];
  missing: {
    id: string;
    label: string;
    reason: string;
    targetSection: OpsOverviewTargetSection;
  }[];
};

export type OpsOverviewTimelineItem = {
  id: string;
  kind: "sync" | "agent_run" | "worker" | "task" | "project" | "review" | "release" | "worklog";
  status: "completed" | "queued" | "running" | "failed" | "info" | "warning";
  title: string;
  detail: string;
  source: string;
  occurredAt: string;
  target?: {
    section: OpsOverviewTargetSection;
    id?: string;
  };
};

export type OpsOverviewDataTrust = {
  activeSource: "live" | "export" | "supabase";
  generatedAt: string;
  tables: {
    name: string;
    status: "ok" | "empty" | "error";
    count?: number;
  }[];
  warnings: string[];
  emptyButExpected: string[];
};

export type OpsOverviewModel = {
  generatedAt: string;
  source: {
    mode: "live" | "export" | "supabase";
    supabaseReachable: boolean;
    freshness: OpsOverviewFreshness;
    warnings: string[];
  };
  command: OpsOverviewCommand;
  actions: OpsOverviewActionItem[];
  projects: OpsOverviewProjectHealth[];
  system: OpsOverviewSystemHealth;
  knowledge: OpsOverviewKnowledgeSnapshot;
  timeline: OpsOverviewTimelineItem[];
  dataTrust: OpsOverviewDataTrust;
};
