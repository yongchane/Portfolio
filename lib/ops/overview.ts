import type {
  NoteItem,
  OpsAiReview,
  OpsConsoleData,
  OpsOverviewActionItem,
  OpsOverviewCmsBucketStatus,
  OpsOverviewCommand,
  OpsOverviewDataTrust,
  OpsOverviewHealthItem,
  OpsOverviewKnowledgeSnapshot,
  OpsOverviewModel,
  OpsOverviewProjectHealth,
  OpsOverviewSystemHealth,
  OpsOverviewTimelineItem,
  Project,
} from "@/lib/ops/types";

const STALE_MINUTES = 10;

function minutesSince(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return (Date.now() - timestamp) / 60000;
}

function isFresh(value?: string) {
  return minutesSince(value) <= STALE_MINUTES;
}

function byOccurredAtDesc<T extends { occurredAt: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.occurredAt || 0).getTime();
    const bTime = new Date(b.occurredAt || 0).getTime();
    return bTime - aTime;
  });
}

function latestTimestamp(values: Array<string | undefined>) {
  const latest = values
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : new Date().toISOString();
}

function getOverviewGeneratedAt(data: OpsConsoleData) {
  return latestTimestamp([
    data.dataSource.generatedAt,
    data.github.generatedAt,
    data.workerHeartbeats[0]?.lastSeenAt,
    data.hostStatuses[0]?.createdAt,
    data.openclawStatuses[0]?.createdAt,
    data.syncRequests[0]?.requestedAt,
    data.agentRuns[0]?.createdAt,
    data.tasks[0]?.updatedAt,
  ]);
}

export function buildOpsOverviewModel(data: OpsConsoleData): OpsOverviewModel {
  const generatedAt = getOverviewGeneratedAt(data);
  const actions = buildActionQueue(data);
  const projects = buildProjectHealth(data);
  const system = buildSystemHealth(data);
  const knowledge = buildKnowledgeSnapshot(data);
  const timeline = buildOperationsTimeline(data);
  const dataTrust = buildDataTrust(data);
  const command = buildCommand(data, actions, projects, system);

  return {
    generatedAt,
    source: {
      mode: data.dataSource.mode,
      supabaseReachable: Boolean(data.dataSource.sourceHealth.supabaseReachable),
      freshness: isFresh(generatedAt) ? "fresh" : "stale",
      warnings: dataTrust.warnings,
    },
    command,
    actions,
    projects,
    system,
    knowledge,
    timeline,
    dataTrust,
  };
}

function buildCommand(
  data: OpsConsoleData,
  actions: OpsOverviewActionItem[],
  projects: OpsOverviewProjectHealth[],
  system: OpsOverviewSystemHealth,
): OpsOverviewCommand {
  const activeTasks = data.tasks.filter((task) => task.status === "doing" || task.status === "planned").length;
  const verifyingTasks = data.tasks.filter((task) => task.status === "verifying").length;
  const blockedTasks = data.tasks.filter((task) => task.status === "blocked").length;
  const reviewNeededProjects = projects.filter((project) => project.signals.aiReviewCoverage === "missing").length;
  const staleSystems = Object.values(system).filter((item) => item.status === "stale" || item.status === "offline" || item.status === "warning").length;

  const mostImportant = actions[0];
  const status = blockedTasks || staleSystems ? "risk" : verifyingTasks || reviewNeededProjects || actions.length ? "attention" : "healthy";

  return {
    status,
    title:
      status === "risk"
        ? "오늘은 막힘/복구 항목을 먼저 확인해야 합니다"
        : status === "attention"
          ? "오늘은 검증과 리뷰 정리가 필요합니다"
          : "오늘 운영 상태는 안정적입니다",
    summary: `검증 대기 ${verifyingTasks}개, blocked ${blockedTasks}개, AI 리뷰 누락 프로젝트 ${reviewNeededProjects}개, 시스템 주의 ${staleSystems}개입니다.`,
    primaryAction: mostImportant
      ? {
          label: mostImportant.cta,
          targetSection: mostImportant.target.section,
          targetId: mostImportant.target.id,
        }
      : undefined,
    stats: {
      activeTasks,
      verifyingTasks,
      blockedTasks,
      reviewNeededProjects,
      staleSystems,
    },
  };
}

function buildActionQueue(data: OpsConsoleData): OpsOverviewActionItem[] {
  const actions: OpsOverviewActionItem[] = [];

  for (const task of data.tasks) {
    if (task.status === "blocked") {
      actions.push({
        id: `blocked-task-${task.id}`,
        severity: "critical",
        category: "blocked",
        title: task.title,
        reason: task.needsDecision?.[0] || "작업이 blocked 상태입니다.",
        source: { table: "ops_tasks", id: task.id },
        target: { section: "tasks", id: task.id },
        cta: "막힌 작업 확인",
        createdAt: task.updatedAt,
      });
    }

    if (task.status === "verifying") {
      actions.push({
        id: `verify-task-${task.id}`,
        severity: "warning",
        category: "verification",
        title: task.title,
        reason: "완료 작업이 검증 대기 상태입니다.",
        source: { table: "ops_tasks", id: task.id },
        target: { section: "tasks", id: task.id },
        cta: "Tasks에서 검증",
        createdAt: task.updatedAt,
      });
    }
  }

  for (const run of data.agentRuns) {
    if (run.status === "needs_approval") {
      actions.push({
        id: `agent-approval-${run.id}`,
        severity: "warning",
        category: "approval",
        title: run.prompt.slice(0, 80) || "Agent run approval required",
        reason: "에이전트 실행이 사용자 승인 대기 상태입니다.",
        source: { table: "ops_agent_runs", id: run.id },
        target: { section: "aeyong", id: run.id },
        cta: "승인 대기 확인",
        createdAt: run.createdAt,
      });
    }
  }

  const reviewsByProject = new Map<string, OpsAiReview[]>();
  for (const review of data.aiReviews) {
    reviewsByProject.set(review.projectId, [...(reviewsByProject.get(review.projectId) || []), review]);
  }

  for (const project of data.projects) {
    if (!reviewsByProject.get(project.id)?.length) {
      actions.push({
        id: `review-needed-${project.id}`,
        severity: "info",
        category: "review",
        title: `${project.name} AI 리뷰 필요`,
        reason: "QA/Security/Feature/Update/UIUX 리뷰 데이터가 아직 없습니다.",
        source: { table: "ops_ai_reviews" },
        target: { section: "projects", id: project.id },
        cta: "프로젝트 리뷰 확인",
      });
    }
  }

  const worker = data.workerHeartbeats[0];
  if (!worker || worker.status !== "online" || !isFresh(worker.lastSeenAt)) {
    actions.push({
      id: "worker-recovery",
      severity: worker?.status === "error" || !worker ? "critical" : "warning",
      category: "recovery",
      title: "Mac mini worker 상태 확인 필요",
      reason: worker
        ? worker.status === "online" && !isFresh(worker.lastSeenAt)
          ? `worker는 online이지만 heartbeat가 오래되었습니다. lastSeen=${worker.lastSeenAt}`
          : `latest status=${worker.status}, lastSeen=${worker.lastSeenAt}`
        : "worker heartbeat가 없습니다.",
      source: { table: "ops_worker_heartbeats", id: worker?.id },
      target: { section: "worker", id: worker?.id },
      cta: "Worker 상태 보기",
      createdAt: worker?.lastSeenAt,
    });
  }

  if (!data.worklogs.length) {
    actions.push({
      id: "cms-worklog-empty",
      severity: "info",
      category: "cms",
      title: "AI worklog 적재가 비어 있습니다",
      reason: "작업 기록이 DB에 쌓이면 Overview가 운영 히스토리를 더 정확히 보여줄 수 있습니다.",
      source: { table: "ops_worklogs" },
      target: { section: "notes" },
      cta: "Docs/Vault 확인",
    });
  }

  return actions
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const;
      return rank[a.severity] - rank[b.severity];
    })
    .slice(0, 12);
}

function projectNotes(project: Project, notes: NoteItem[]) {
  return notes.filter((note) => note.project === project.id || note.project === project.name || project.docs?.includes(note.id));
}

function buildProjectHealth(data: OpsConsoleData): OpsOverviewProjectHealth[] {
  return data.projects
    .map((project) => {
      const tasks = data.tasks.filter((task) => task.projectId === project.id);
      const activeTasks = tasks.filter((task) => task.status === "planned" || task.status === "doing").length;
      const verifyingTasks = tasks.filter((task) => task.status === "verifying").length;
      const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
      const notes = projectNotes(project, data.notes);
      const aiReviews = data.aiReviews.filter((review) => review.projectId === project.id);
      const githubRisk: OpsOverviewProjectHealth["signals"]["githubRisk"] = project.githubFocus?.length ? "attention" : project.repo ? "clean" : "unknown";
      const releaseState: OpsOverviewProjectHealth["signals"]["releaseState"] = data.github.releases.some((release) => release.repo === project.repo) ? "ready" : project.repo ? "missing" : "unknown";

      let score = 100;
      if (blockedTasks) score -= 30;
      if (verifyingTasks) score -= 15;
      if (!aiReviews.length) score -= 15;
      if (!notes.length) score -= 10;
      if (githubRisk === "attention") score -= 15;
      if (releaseState === "missing") score -= 5;
      score = Math.max(0, score);

      const health: OpsOverviewProjectHealth["health"] = score < 60 ? "risk" : score < 85 ? "attention" : "healthy";
      const diagnosis = blockedTasks
        ? "막힌 작업이 있어 먼저 의사결정이 필요합니다."
        : verifyingTasks
          ? "검증 중 작업이 있어 완료 판정이 필요합니다."
          : !aiReviews.length
            ? "AI 리뷰 데이터가 아직 없어 운영 리스크 판단 근거가 부족합니다."
            : !notes.length
              ? "연결 문서가 부족해 CMS 커버리지가 약합니다."
              : "운영 신호가 비교적 안정적입니다.";

      const nextAction = blockedTasks
        ? "blocked task를 먼저 확인하세요."
        : verifyingTasks
          ? "검증 대기 작업을 닫으세요."
          : !aiReviews.length
            ? "QA/Security/UIUX 리뷰를 생성하세요."
            : !notes.length
              ? "프로젝트 문서를 연결하세요."
              : "프로젝트 운영 상태를 유지하세요.";

      const docsCoverage: OpsOverviewProjectHealth["signals"]["docsCoverage"] = notes.length >= 3 ? "good" : notes.length ? "partial" : "missing";
      const aiReviewCoverage: OpsOverviewProjectHealth["signals"]["aiReviewCoverage"] = aiReviews.length ? "good" : "missing";

      return {
        projectId: project.id,
        name: project.name,
        stage: project.stage,
        health,
        score,
        diagnosis,
        nextAction,
        counts: {
          tasks: tasks.length,
          activeTasks,
          verifyingTasks,
          blockedTasks,
          notes: notes.length,
          aiReviews: aiReviews.length,
        },
        signals: {
          docsCoverage,
          aiReviewCoverage,
          githubRisk,
          releaseState,
        },
        links: {
          repo: project.repo,
          deployUrl: project.deployUrl,
        },
      };
    })
    .sort((a, b) => a.score - b.score);
}

function buildSystemHealth(data: OpsConsoleData): OpsOverviewSystemHealth {
  const worker = data.workerHeartbeats[0];
  const host = data.hostStatuses[0];
  const openclaw = data.openclawStatuses[0];
  const health = data.dataSource.sourceHealth;

  const workerItem: OpsOverviewHealthItem = {
    status: !worker ? "unknown" : worker.status === "online" && isFresh(worker.lastSeenAt) ? "online" : worker.status === "online" ? "stale" : worker.status === "error" ? "warning" : "offline",
    label: worker?.workerName || "Worker",
    detail: worker ? `${worker.machine} · ${worker.status === "online" && !isFresh(worker.lastSeenAt) ? "online but heartbeat stale" : worker.status}` : "heartbeat waiting",
    lastSeenAt: worker?.lastSeenAt,
    targetSection: "worker",
  };

  return {
    worker: workerItem,
    macMini: {
      status: host && isFresh(host.createdAt) ? "online" : host ? "stale" : "unknown",
      label: "Mac mini",
      detail: host ? `${host.machine} ${isFresh(host.createdAt) ? "reporting" : "reporting but stale"}` : "host status waiting",
      lastSeenAt: host?.createdAt,
      targetSection: "macmini",
    },
    openclaw: {
      status: openclaw?.gatewayStatus === "running" ? "online" : openclaw ? "warning" : "unknown",
      label: "OpenClaw",
      detail: openclaw?.gatewayStatus ? `gateway ${openclaw.gatewayStatus}` : "status waiting",
      lastSeenAt: openclaw?.createdAt,
      targetSection: "macmini",
    },
    supabase: {
      status: health.supabaseReachable ? "online" : "warning",
      label: "Supabase",
      detail: health.supabaseReachable ? "configured + reachable" : "unreachable or fallback",
      lastSeenAt: data.dataSource.generatedAt,
      targetSection: "settings",
    },
    github: {
      status: data.github.repoSnapshots.length ? "online" : "unknown",
      label: "GitHub",
      detail: `${data.github.repoSnapshots.length} repos · ${data.github.releases.length} releases`,
      lastSeenAt: data.github.generatedAt,
      targetSection: "projects",
    },
  };
}

function countNotes(notes: NoteItem[], terms: string[]) {
  const lowerTerms = terms.map((term) => term.toLowerCase());
  return notes.filter((note) => {
    const haystack = `${note.title} ${note.type} ${note.folder} ${note.tags.join(" ")} ${note.path}`.toLowerCase();
    return lowerTerms.some((term) => haystack.includes(term));
  }).length;
}

function buildKnowledgeSnapshot(data: OpsConsoleData): OpsOverviewKnowledgeSnapshot {
  const buckets: OpsOverviewCmsBucketStatus[] = [
    { id: "spec", label: "기능명세서", count: countNotes(data.notes, ["spec", "기능명세", "requirements"]), status: "empty" },
    { id: "aarrr", label: "AARRR", count: countNotes(data.notes, ["aarrr"]), status: "empty" },
    { id: "ia", label: "IA/User Flow", count: countNotes(data.notes, ["ia", "user flow", "flow"]), status: "empty" },
    { id: "ai", label: "AI 활용 기록", count: countNotes(data.notes, ["ai", "aeyong", "openclaw"]), status: "empty" },
    { id: "retro", label: "프로젝트 회고", count: countNotes(data.notes, ["retro", "회고"]), status: "empty" },
    { id: "worklog", label: "작업 로그", count: data.worklogs.length, status: "empty" },
    { id: "decision", label: "결정 기록", count: data.artifacts.filter((artifact) => artifact.artifactType === "decision").length, status: "empty" },
    { id: "reference", label: "레퍼런스 분석", count: countNotes(data.notes, ["reference", "레퍼런스", "analysis"]), status: "empty" },
  ].map((bucket) => ({ ...bucket, status: bucket.count ? "healthy" : "empty" }));

  return {
    coverage: {
      totalNotes: data.notes.length,
      projectLinkedNotes: data.vault.projectMappedCount,
      orphanNotes: Math.max(data.notes.length - data.vault.projectMappedCount, 0),
      worklogs: data.worklogs.length,
      artifacts: data.artifacts.length,
    },
    buckets,
    recentNotes: data.notes.slice(0, 5).map((note) => ({
      id: note.id,
      title: note.title,
      type: note.type,
      project: note.project,
      updatedAt: note.updatedAt,
    })),
    missing: buckets
      .filter((bucket) => !bucket.count)
      .slice(0, 4)
      .map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        reason: `${bucket.label} 버킷이 비어 있습니다.`,
        targetSection: "notes" as const,
      })),
  };
}

function mapTimelineStatus(status?: string): OpsOverviewTimelineItem["status"] {
  if (status === "completed" || status === "shipped" || status === "online") return "completed";
  if (status === "queued" || status === "needs_approval") return "queued";
  if (status === "running" || status === "doing") return "running";
  if (status === "failed" || status === "blocked" || status === "error") return "failed";
  if (status === "verifying" || status === "stale") return "warning";
  return "info";
}

function buildOperationsTimeline(data: OpsConsoleData): OpsOverviewTimelineItem[] {
  const items: OpsOverviewTimelineItem[] = [
    ...data.syncRequests.map((request) => ({
      id: `sync-${request.id}`,
      kind: "sync" as const,
      status: mapTimelineStatus(request.status),
      title: `Sync ${request.type}`,
      detail: request.error || request.status,
      source: "ops_sync_requests",
      occurredAt: request.requestedAt,
      target: { section: "worker" as const, id: request.id },
    })),
    ...data.agentRuns.map((run) => ({
      id: `agent-run-${run.id}`,
      kind: "agent_run" as const,
      status: mapTimelineStatus(run.status),
      title: run.prompt.slice(0, 80) || "Agent run",
      detail: run.resultSummary || run.status,
      source: "ops_agent_runs",
      occurredAt: run.createdAt,
      target: { section: "aeyong" as const, id: run.id },
    })),
    ...data.workerHeartbeats.slice(0, 3).map((heartbeat) => ({
      id: `worker-${heartbeat.id}`,
      kind: "worker" as const,
      status: mapTimelineStatus(heartbeat.status),
      title: heartbeat.workerName,
      detail: `${heartbeat.machine} · ${heartbeat.status}`,
      source: "ops_worker_heartbeats",
      occurredAt: heartbeat.lastSeenAt,
      target: { section: "worker" as const, id: heartbeat.id },
    })),
    ...data.tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: "task" as const,
      status: mapTimelineStatus(task.status),
      title: task.title,
      detail: task.status,
      source: "ops_tasks",
      occurredAt: task.updatedAt,
      target: { section: "tasks" as const, id: task.id },
    })),
    ...data.projects.map((project) => ({
      id: `project-${project.id}`,
      kind: "project" as const,
      status: "info" as const,
      title: project.name,
      detail: project.stage,
      source: "ops_projects",
      occurredAt: data.dataSource.generatedAt,
      target: { section: "projects" as const, id: project.id },
    })),
    ...data.worklogs.map((worklog) => ({
      id: `worklog-${worklog.id}`,
      kind: "worklog" as const,
      status: mapTimelineStatus(worklog.status),
      title: worklog.title,
      detail: worklog.summary,
      source: "ops_worklogs",
      occurredAt: worklog.updatedAt,
      target: { section: "aeyong" as const, id: worklog.id },
    })),
  ];

  return byOccurredAtDesc(items).slice(0, 12);
}

function buildDataTrust(data: OpsConsoleData): OpsOverviewDataTrust {
  const tables = [
    ["ops_projects", data.projects.length],
    ["ops_tasks", data.tasks.length],
    ["ops_notes", data.notes.length],
    ["ops_worklogs", data.worklogs.length],
    ["ops_artifacts", data.artifacts.length],
    ["ops_worker_heartbeats", data.workerHeartbeats.length],
    ["ops_host_status", data.hostStatuses.length],
    ["ops_openclaw_status", data.openclawStatuses.length],
    ["ops_sync_requests", data.syncRequests.length],
    ["ops_agents", data.agents.length],
    ["ops_agent_runs", data.agentRuns.length],
    ["ops_ai_reviews", data.aiReviews.length],
  ] as const;

  const emptyButExpected = tables
    .filter(([name, count]) => count === 0 && ["ops_worklogs", "ops_artifacts", "ops_ai_reviews"].includes(name))
    .map(([name]) => name);

  return {
    activeSource: data.dataSource.mode,
    generatedAt: getOverviewGeneratedAt(data),
    tables: tables.map(([name, count]) => ({

      name,
      count,
      status: count ? "ok" : "empty",
    })),
    warnings: [
      data.dataSource.sourceHealth.lastSyncMessage,
      emptyButExpected.length ? `Empty runtime tables: ${emptyButExpected.join(", ")}` : undefined,
      "Agent execution is still safe-stubbed until OpenClaw/ACP policy is wired.",
    ].filter(Boolean) as string[],
    emptyButExpected,
  };
}
