import type {
  GitHubProjectBoardSnapshot,
  GitHubRepoSnapshot,
  NoteItem,
  OpsAiReview,
  OpsAiReviewCategory,
  OpsAiReviewSeverity,
  OpsConsoleData,
  OpsProjectActionItem,
  OpsProjectAiReviewColumn,
  OpsProjectCommand,
  OpsProjectCommandStatus,
  OpsProjectDataTrust,
  OpsProjectEvidence,
  OpsProjectModel,
  OpsProjectRailItem,
  Project,
  Task,
} from "@/lib/ops/types";
import {
  getProjectBoardsForRepo,
  getProjectLinkedNotesCount,
  getProjectNextActions,
  getProjectReleases,
  getProjectTasks,
  getSelectedProjectNotes,
  getSelectedRepo,
} from "@/lib/ops/selectors";

const REVIEW_CATEGORIES: Array<{
  category: OpsAiReviewCategory;
  label: string;
  helper: string;
}> = [
  { category: "qa", label: "QA", helper: "오류/깨진 플로우/회귀 위험" },
  { category: "security", label: "Security", helper: "보안/비밀값/권한/노출 위험" },
  { category: "feature", label: "Feature", helper: "기능 완성도/누락/우선순위" },
  { category: "update", label: "Update", helper: "의존성/문서/운영 업데이트" },
  { category: "uiux", label: "UI/UX", helper: "사용성/정보구조/AI slop 감지" },
];

const severityRank: Record<OpsAiReviewSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function statusFromScore(score: number): OpsProjectCommandStatus {
  if (score < 60) return "risk";
  if (score < 85) return "attention";
  return "healthy";
}

function latestTimestamp(values: Array<string | undefined>) {
  const latest = values
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date().toISOString();
}

function extractProjectBoardScopeWarning(warnings: string[] | undefined, owner?: string) {
  return warnings?.find(
    (warning) =>
      warning.includes("read:project") &&
      (!owner || warning.includes(`projects(${owner})`)),
  );
}

function getProjectReviews(data: OpsConsoleData, project: Project) {
  return data.aiReviews.filter((review) => review.projectId === project.id);
}

function getOpenReviews(reviews: OpsAiReview[]) {
  return reviews.filter((review) => review.status === "open");
}

function getFailedWorkflowRuns(data: OpsConsoleData, repo?: string) {
  return (data.github.workflowRuns || []).filter(
    (run) => run.repo === repo && (run.conclusion === "failure" || run.conclusion === "cancelled"),
  );
}

function getSecurityAlerts(data: OpsConsoleData, repo?: string) {
  return (data.github.securityAlerts || []).filter((alert) => alert.repo === repo && alert.state !== "fixed");
}

function getProjectScore(args: {
  project: Project;
  tasks: Task[];
  reviews: OpsAiReview[];
  linkedNotesCount: number;
  failedWorkflowRuns: NonNullable<OpsConsoleData["github"]["workflowRuns"]>;
  securityAlerts: NonNullable<OpsConsoleData["github"]["securityAlerts"]>;
  releases: OpsConsoleData["github"]["releases"];
}) {
  const { project, tasks, reviews, linkedNotesCount, failedWorkflowRuns, securityAlerts, releases } = args;
  const openReviews = getOpenReviews(reviews);
  const missingReviewCategories = REVIEW_CATEGORIES.filter(
    ({ category }) => !reviews.some((review) => review.category === category),
  ).length;

  let score = 100;
  if (tasks.some((task) => task.status === "blocked")) score -= 30;
  if (tasks.some((task) => task.status === "verifying")) score -= 12;
  score -= openReviews.filter((review) => review.severity === "high").length * 20;
  score -= openReviews.filter((review) => review.severity === "medium").length * 10;
  score -= missingReviewCategories * 5;
  if (failedWorkflowRuns.length) score -= 15;
  if (securityAlerts.length) score -= 25;
  if (!linkedNotesCount) score -= 10;
  if (!project.repo) score -= 8;
  if ((project.stage === "live" || project.stage === "verifying") && !releases.length) score -= 8;

  return clampScore(score);
}

function buildAiReviewBoard(reviews: OpsAiReview[]): OpsProjectAiReviewColumn[] {
  return REVIEW_CATEGORIES.map(({ category, label, helper }) => {
    const categoryReviews = reviews
      .filter((review) => review.category === category)
      .sort((a, b) => {
        const severityDiff = severityRank[a.severity] - severityRank[b.severity];
        if (severityDiff) return severityDiff;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
    const open = categoryReviews.filter((review) => review.status === "open");
    const highestSeverity = open[0]?.severity || "none";
    const status = open.some((review) => review.severity === "high" || review.severity === "medium")
      ? "risk"
      : categoryReviews.length
        ? "covered"
        : "missing";

    return {
      category,
      label,
      helper,
      status,
      highestSeverity,
      counts: {
        open: open.length,
        resolved: categoryReviews.filter((review) => review.status === "resolved").length,
        ignored: categoryReviews.filter((review) => review.status === "ignored").length,
        total: categoryReviews.length,
      },
      reviews: categoryReviews,
      emptyMessage: `아직 ${label} 리뷰가 없습니다. Floating Agent Panel에서 이 프로젝트 기준 리뷰를 요청할 수 있게 연결 예정입니다.`,
    };
  });
}

function buildActionQueue(args: {
  project: Project;
  tasks: Task[];
  reviews: OpsAiReview[];
  linkedNotesCount: number;
  failedWorkflowRuns: NonNullable<OpsConsoleData["github"]["workflowRuns"]>;
  securityAlerts: NonNullable<OpsConsoleData["github"]["securityAlerts"]>;
  releases: OpsConsoleData["github"]["releases"];
}) {
  const { project, tasks, reviews, linkedNotesCount, failedWorkflowRuns, securityAlerts, releases } = args;
  const actions: OpsProjectActionItem[] = [];

  for (const alert of securityAlerts.slice(0, 3)) {
    actions.push({
      id: `security-${alert.id}`,
      severity: "critical",
      category: "security",
      title: alert.title,
      reason: `${alert.kind} alert is still ${alert.state}.`,
      source: { table: "github_security_alerts", id: alert.id },
      cta: "Security signal 확인",
      createdAt: alert.createdAt,
    });
  }

  for (const run of failedWorkflowRuns.slice(0, 3)) {
    actions.push({
      id: `ci-${run.id}`,
      severity: "critical",
      category: "ci",
      title: `${run.name} failed`,
      reason: `Latest cached workflow result: ${run.conclusion || run.status}.`,
      source: { table: "github_workflow_runs", id: run.id },
      cta: "CI 로그 확인",
      createdAt: run.updatedAt || run.createdAt,
    });
  }

  for (const task of tasks.filter((item) => item.status === "blocked")) {
    actions.push({
      id: `blocked-${task.id}`,
      severity: "critical",
      category: "blocked",
      title: task.title,
      reason: task.needsDecision?.[0] || "Blocked task가 있어 의사결정이 필요합니다.",
      source: { table: "ops_tasks", id: task.id },
      cta: "막힌 작업 확인",
      createdAt: task.updatedAt,
    });
  }

  for (const review of getOpenReviews(reviews).filter((item) => item.severity === "high" || item.severity === "medium")) {
    actions.push({
      id: `review-${review.id}`,
      severity: review.severity === "high" ? "critical" : "warning",
      category: "review",
      title: review.title,
      reason: review.recommendation || review.comment,
      source: { table: "ops_ai_reviews", id: review.id },
      cta: `${review.category} 리뷰 처리`,
      createdAt: review.updatedAt || review.createdAt,
    });
  }

  for (const task of tasks.filter((item) => item.status === "verifying")) {
    actions.push({
      id: `verify-${task.id}`,
      severity: "warning",
      category: "verification",
      title: task.title,
      reason: "검증 대기 작업입니다.",
      source: { table: "ops_tasks", id: task.id },
      cta: "검증 완료 여부 판단",
      createdAt: task.updatedAt,
    });
  }

  for (const { category, label } of REVIEW_CATEGORIES) {
    if (!reviews.some((review) => review.category === category)) {
      actions.push({
        id: `missing-review-${category}`,
        severity: "info",
        category: "review",
        title: `${label} 리뷰 필요`,
        reason: `${label} 관점의 AI 리뷰가 아직 없습니다.`,
        source: { table: "ops_ai_reviews" },
        cta: "리뷰 요청 준비",
      });
    }
  }

  if (!linkedNotesCount) {
    actions.push({
      id: "missing-docs",
      severity: "info",
      category: "docs",
      title: "연결 문서 부족",
      reason: "프로젝트와 연결된 Docs/Vault note가 없습니다.",
      source: { table: "ops_notes" },
      cta: "문서 연결 확인",
    });
  }

  if (!project.repo) {
    actions.push({
      id: "missing-repo",
      severity: "info",
      category: "setup",
      title: "Repository 연결 없음",
      reason: "프로젝트 repo가 연결되지 않아 GitHub 신호를 판단할 수 없습니다.",
      source: { table: "ops_projects", id: project.id },
      cta: "프로젝트 설정 확인",
    });
  }

  if ((project.stage === "live" || project.stage === "verifying") && !releases.length) {
    actions.push({
      id: "missing-release",
      severity: "warning",
      category: "release",
      title: "Release signal 없음",
      reason: "검증/운영 단계 프로젝트지만 GitHub release가 없습니다.",
      source: { table: "github_releases" },
      cta: "릴리즈 상태 확인",
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return actions.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 10);
}

function buildProjectContext(args: {
  data: OpsConsoleData;
  project: Project;
  githubReposByName: Map<string, GitHubRepoSnapshot>;
  projectBoardsByOwner: Map<string, GitHubProjectBoardSnapshot[]>;
}) {
  const { data, project, githubReposByName, projectBoardsByOwner } = args;
  const repo = getSelectedRepo(project, githubReposByName);
  const tasks = getProjectTasks(data.tasks, project.id);
  const linkedNotes = getSelectedProjectNotes(data.notes, project);
  const linkedNotesCount = getProjectLinkedNotesCount(data.notes, project);
  const boards = getProjectBoardsForRepo(repo, projectBoardsByOwner);
  const releases = getProjectReleases(data, repo?.repo);
  const workflowRuns = (data.github.workflowRuns || []).filter((run) => run.repo === repo?.repo);
  const failedWorkflowRuns = getFailedWorkflowRuns(data, repo?.repo);
  const securityAlerts = getSecurityAlerts(data, repo?.repo);
  const reviews = getProjectReviews(data, project);
  const score = getProjectScore({ project, tasks, reviews, linkedNotesCount, failedWorkflowRuns, securityAlerts, releases });

  return {
    repo,
    tasks,
    linkedNotes,
    linkedNotesCount,
    boards,
    releases,
    workflowRuns,
    failedWorkflowRuns,
    securityAlerts,
    reviews,
    score,
    status: statusFromScore(score),
  };
}

export function buildOpsProjectModel(args: {
  data: OpsConsoleData;
  selectedProject: Project;
  githubReposByName: Map<string, GitHubRepoSnapshot>;
  projectBoardsByOwner: Map<string, GitHubProjectBoardSnapshot[]>;
}): OpsProjectModel {
  const { data, selectedProject, githubReposByName, projectBoardsByOwner } = args;
  const context = buildProjectContext({ data, project: selectedProject, githubReposByName, projectBoardsByOwner });
  const actions = buildActionQueue({
    project: selectedProject,
    tasks: context.tasks,
    reviews: context.reviews,
    linkedNotesCount: context.linkedNotesCount,
    failedWorkflowRuns: context.failedWorkflowRuns,
    securityAlerts: context.securityAlerts,
    releases: context.releases,
  });
  const aiReviewBoard = buildAiReviewBoard(context.reviews);
  const missingReviewCategories = aiReviewBoard.filter((column) => column.status === "missing").length;
  const openReviews = getOpenReviews(context.reviews);

  const command: OpsProjectCommand = {
    status: context.status,
    score: context.score,
    title:
      context.status === "risk"
        ? "이 프로젝트는 먼저 리스크를 정리해야 합니다"
        : context.status === "attention"
          ? "이 프로젝트는 검증/리뷰 보강이 필요합니다"
          : "이 프로젝트는 운영 흐름이 안정적입니다",
    summary: `blocked ${context.tasks.filter((task) => task.status === "blocked").length}개, 검증 ${context.tasks.filter((task) => task.status === "verifying").length}개, open review ${openReviews.length}개, missing review category ${missingReviewCategories}개입니다.`,
    primaryAction: actions[0]
      ? {
          label: actions[0].cta,
          actionId: actions[0].id,
        }
      : undefined,
    stats: {
      tasks: context.tasks.length,
      blockedTasks: context.tasks.filter((task) => task.status === "blocked").length,
      verifyingTasks: context.tasks.filter((task) => task.status === "verifying").length,
      openReviews: openReviews.length,
      missingReviewCategories,
      linkedNotes: context.linkedNotesCount,
      failedRuns: context.failedWorkflowRuns.length,
      securityAlerts: context.securityAlerts.length,
    },
  };

  const rail: OpsProjectRailItem[] = data.projects
    .map((project) => {
      const projectContext = buildProjectContext({ data, project, githubReposByName, projectBoardsByOwner });
      const projectOpenReviews = getOpenReviews(projectContext.reviews);
      return {
        projectId: project.id,
        name: project.name,
        stage: project.stage,
        repo: project.repo,
        status: projectContext.status,
        score: projectContext.score,
        counts: {
          blockedTasks: projectContext.tasks.filter((task) => task.status === "blocked").length,
          verifyingTasks: projectContext.tasks.filter((task) => task.status === "verifying").length,
          openReviews: projectOpenReviews.length,
          highReviews: projectOpenReviews.filter((review) => review.severity === "high").length,
          linkedNotes: projectContext.linkedNotesCount,
        },
      };
    })
    .sort((a, b) => a.score - b.score);

  const evidence: OpsProjectEvidence = {
    execution: {
      tasks: context.tasks,
      nextActions: getProjectNextActions(context.tasks),
      checklist: selectedProject.checklist || [],
      sectors: selectedProject.sectors || [],
      operatingCadence: selectedProject.operatingCadence || [],
      adminSurfaces: selectedProject.adminSurfaces || [],
    },
    docs: {
      linkedNotes: context.linkedNotes as NoteItem[],
      linkedNotesCount: context.linkedNotesCount,
      missing: !context.linkedNotesCount,
    },
    github: {
      repo: context.repo,
      boards: context.boards,
      releases: context.releases,
      workflowRuns: context.workflowRuns,
      failedWorkflowRuns: context.failedWorkflowRuns,
      securityAlerts: context.securityAlerts,
      boardScopeWarning: extractProjectBoardScopeWarning(data.github.warnings, context.repo?.owner),
    },
  };

  const generatedAt = latestTimestamp([
    data.dataSource.generatedAt,
    data.github.generatedAt,
    ...context.tasks.map((task) => task.updatedAt),
    ...context.reviews.map((review) => review.updatedAt || review.createdAt),
  ]);

  const dataTrust: OpsProjectDataTrust = {
    activeSource: data.dataSource.mode,
    generatedAt,
    counts: {
      projects: data.projects.length,
      tasks: context.tasks.length,
      aiReviews: context.reviews.length,
      linkedNotes: context.linkedNotesCount,
      workflowRuns: context.workflowRuns.length,
      securityAlerts: context.securityAlerts.length,
    },
    warnings: [
      data.dataSource.sourceHealth.lastSyncMessage,
      context.repo ? undefined : "Repository is not connected for this project.",
      missingReviewCategories ? `Missing review categories: ${missingReviewCategories}` : undefined,
      context.linkedNotesCount ? undefined : "No linked Docs/Vault notes for this project.",
      "Agent execution is still queue/stub based until worker execution policy is fully wired.",
    ].filter(Boolean) as string[],
  };

  return {
    generatedAt,
    selectedProject,
    rail,
    command,
    actions,
    aiReviewBoard,
    evidence,
    dataTrust,
  };
}
