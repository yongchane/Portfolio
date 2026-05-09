import { buildOpsProjectModel } from "@/lib/ops/projects";
import type { GitHubRepoSnapshot, OpsConsoleData, Project, Task } from "@/lib/ops/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const project: Project = {
  id: "portfolio-ops",
  name: "Portfolio /ops",
  stage: "verifying",
  summary: "Personal OS console",
  repo: "yongchane/Portfolio",
  branch: "develop",
  deployUrl: "https://hyunyongchan.kr/ops",
};

const blockedTask: Task = {
  id: "task-blocked",
  title: "Fix blocked ops flow",
  projectId: project.id,
  category: "ops",
  status: "blocked",
  summary: "Blocked task",
  completedWork: [],
  nextActions: ["Decide recovery path"],
  needsDecision: ["Need owner decision"],
  updatedAt: "2026-05-09T01:00:00.000Z",
};

const repo: GitHubRepoSnapshot = {
  repo: "yongchane/Portfolio",
  owner: "yongchane",
  name: "Portfolio",
  url: "https://github.com/yongchane/Portfolio",
  description: "Portfolio",
  visibility: "public",
  defaultBranch: "develop",
};

const data: OpsConsoleData = {
  projects: [project],
  tasks: [blockedTask],
  notes: [],
  worklogs: [],
  artifacts: [],
  github: {
    generatedAt: "2026-05-09T02:00:00.000Z",
    mode: "live",
    repoSnapshots: [repo],
    releases: [],
    projectBoards: [],
    workflowRuns: [
      {
        id: "run-1",
        repo: "yongchane/Portfolio",
        name: "CI",
        status: "completed",
        conclusion: "failure",
        url: "https://github.com/yongchane/Portfolio/actions/runs/1",
        updatedAt: "2026-05-09T02:00:00.000Z",
      },
    ],
    securityAlerts: [
      {
        id: "alert-1",
        repo: "yongchane/Portfolio",
        kind: "secret-scanning",
        state: "open",
        title: "Secret exposure",
        severity: "high",
      },
    ],
  },
  vault: {
    notesCount: 0,
    templatesCount: 0,
    rootCount: 0,
    projectMappedCount: 0,
    orphanNoteIds: [],
    folders: [],
    tags: [],
    links: [],
  },
  openclaw: {
    generatedAt: "2026-05-09T02:00:00.000Z",
    host: "test-host",
    workspaceRoot: "/tmp/workspace",
    configPath: "/tmp/openclaw.json",
    model: { fallback: [], allowed: [], gpt55Configured: false, configuredAgents: [] },
    preferences: { checklistFirst: false, conciseKeywordReport: false, staleModelMention: false },
    files: [],
    issues: [],
    health: { score: 100, high: 0, medium: 0, low: 0 },
  },
  workerHeartbeats: [],
  hostStatuses: [],
  openclawStatuses: [],
  syncRequests: [],
  agents: [],
  agentRuns: [],
  aiReviews: [
    {
      id: "review-1",
      projectId: project.id,
      repo: "yongchane/Portfolio",
      category: "security",
      severity: "high",
      title: "Protect secrets",
      comment: "Secret scanning alert needs review.",
      recommendation: "Rotate and verify secrets.",
      evidence: {},
      status: "open",
      createdAt: "2026-05-09T01:30:00.000Z",
      updatedAt: "2026-05-09T01:30:00.000Z",
    },
  ],
  dataSource: {
    mode: "supabase",
    generatedAt: "2026-05-09T02:00:00.000Z",
    notesRoots: [],
    resolvedRoots: [],
    notesCount: 0,
    sourceHealth: {
      supabaseConfigured: true,
      supabaseReachable: true,
      activeMode: "supabase",
      preferredMode: "supabase",
      notesMode: "supabase",
    },
  },
};

const githubReposByName = new Map([[repo.repo, repo]]);
const projectBoardsByOwner = new Map();

const model = buildOpsProjectModel({ data, selectedProject: project, githubReposByName, projectBoardsByOwner });

assert(model.command.status === "risk", "blocked task, failed CI, security alert, and high review should make project risky");
assert(model.actions[0]?.category === "security", "security alert should be the highest-priority project action");
assert(model.aiReviewBoard.find((column: { category: string; status: string }) => column.category === "security")?.status === "risk", "open high security review should mark security column risky");
assert(model.aiReviewBoard.find((column: { category: string; status: string }) => column.category === "qa")?.status === "missing", "missing review category should be explicit");
