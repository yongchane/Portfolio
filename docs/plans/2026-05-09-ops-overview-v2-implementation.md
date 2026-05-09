# Ops Overview v2 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `/ops` Overview as an action-first command center backed by a dedicated overview decision model and API.

**Architecture:** Add a server-side overview builder in `lib/ops/overview.ts` that derives command state, action queue, project health, system health, CMS snapshot, timeline, and data trust from existing ops data. Expose it through `GET /api/ops/overview`, then refactor `components/ops/sections/OverviewSection.tsx` into simple card-based UI components that render the derived model instead of raw data-first dashboard sections.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Supabase-backed ops data loader, existing `/ops` auth/session helpers.

---

## Pre-flight

**Branch:** `develop`

**Do not modify:**
- Supabase schema for this task
- Agent real execution policy
- Other `/ops` pages except shared components if strictly necessary

**Existing design doc:**
- `docs/plans/2026-05-09-ops-overview-v2-design.md`

**Useful existing files:**
- `components/ops/sections/OverviewSection.tsx`
- `components/ops/sections/types.ts`
- `components/ops/OpsConsole.tsx`
- `components/ops/shared.tsx`
- `components/ops/utils.ts`
- `lib/ops/types.ts`
- `lib/ops/supabase-data.ts`
- `lib/ops/auth.ts`
- `app/api/ops/worker/status/route.ts`
- `app/api/ops/agent-runs/route.ts`

---

## Task 1: Define overview model types

**Files:**
- Modify: `lib/ops/types.ts`

**Step 1: Add Overview model types**

Append these types near the existing ops runtime types in `lib/ops/types.ts`:

```ts
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
  activeSource: "supabase" | "local";
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
    mode: "supabase" | "local";
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
```

**Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

**Step 3: Commit**

```bash
git add lib/ops/types.ts
git commit -m "feat(ops): define overview command model types"
```

---

## Task 2: Build overview decision model helper

**Files:**
- Create: `lib/ops/overview.ts`

**Step 1: Create helper skeleton**

Create `lib/ops/overview.ts`:

```ts
import type {
  AgentRunRecord,
  AiReviewRecord,
  NoteItem,
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
  Task,
} from "@/lib/ops/types";
import type { SupabaseOpsConsoleData } from "@/lib/ops/adapters/supabase";

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

function byUpdatedAtDesc<T extends { updatedAt?: string; createdAt?: string; requestedAt?: string; lastSeenAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || a.requestedAt || a.lastSeenAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || b.requestedAt || b.lastSeenAt || 0).getTime();
    return bTime - aTime;
  });
}

export function buildOpsOverviewModel(data: SupabaseOpsConsoleData): OpsOverviewModel {
  const actions = buildActionQueue(data);
  const projects = buildProjectHealth(data);
  const system = buildSystemHealth(data);
  const knowledge = buildKnowledgeSnapshot(data);
  const timeline = buildOperationsTimeline(data);
  const dataTrust = buildDataTrust(data);
  const command = buildCommand(data, actions, projects, system);

  return {
    generatedAt: data.dataSource.generatedAt,
    source: {
      mode: data.dataSource.mode,
      supabaseReachable: Boolean(data.dataSource.sourceHealth.supabaseReachable),
      freshness: isFresh(data.dataSource.generatedAt) ? "fresh" : "stale",
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
```

**Step 2: Implement `buildCommand`**

Add below the skeleton:

```ts
function buildCommand(
  data: SupabaseOpsConsoleData,
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
```

**Step 3: Implement action queue**

Add:

```ts
function buildActionQueue(data: SupabaseOpsConsoleData): OpsOverviewActionItem[] {
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
        title: run.title || "Agent run approval required",
        reason: "에이전트 실행이 사용자 승인 대기 상태입니다.",
        source: { table: "ops_agent_runs", id: run.id },
        target: { section: "aeyong", id: run.id },
        cta: "승인 대기 확인",
        createdAt: run.createdAt,
      });
    }
  }

  const reviewsByProject = new Map<string, AiReviewRecord[]>();
  for (const review of data.aiReviews) {
    if (!review.projectId) continue;
    reviewsByProject.set(review.projectId, [...(reviewsByProject.get(review.projectId) || []), review]);
  }

  for (const project of data.projects) {
    if (!(reviewsByProject.get(project.id)?.length)) {
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
      reason: worker ? `latest status=${worker.status}, lastSeen=${worker.lastSeenAt}` : "worker heartbeat가 없습니다.",
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

  return actions.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  }).slice(0, 12);
}
```

**Step 4: Implement project health**

Add:

```ts
function projectNotes(project: Project, notes: NoteItem[]) {
  return notes.filter((note) => note.project === project.id || note.project === project.name || project.docs?.includes(note.id));
}

function buildProjectHealth(data: SupabaseOpsConsoleData): OpsOverviewProjectHealth[] {
  return data.projects.map((project) => {
    const tasks = data.tasks.filter((task) => task.projectId === project.id);
    const activeTasks = tasks.filter((task) => task.status === "planned" || task.status === "doing").length;
    const verifyingTasks = tasks.filter((task) => task.status === "verifying").length;
    const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
    const notes = projectNotes(project, data.notes);
    const aiReviews = data.aiReviews.filter((review) => review.projectId === project.id);
    const githubRisk = project.githubFocus?.length ? "attention" : project.repo ? "clean" : "unknown";
    const releaseState = data.github.releases.some((release) => release.repo === project.repo) ? "ready" : project.repo ? "missing" : "unknown";

    let score = 100;
    if (blockedTasks) score -= 30;
    if (verifyingTasks) score -= 15;
    if (!aiReviews.length) score -= 15;
    if (!notes.length) score -= 10;
    if (githubRisk === "attention") score -= 15;
    if (releaseState === "missing") score -= 5;
    score = Math.max(0, score);

    const health = score < 60 ? "risk" : score < 85 ? "attention" : "healthy";
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
        docsCoverage: notes.length >= 3 ? "good" : notes.length ? "partial" : "missing",
        aiReviewCoverage: aiReviews.length ? "good" : "missing",
        githubRisk,
        releaseState,
      },
      links: {
        repo: project.repo,
        deployUrl: project.deployUrl,
      },
    };
  }).sort((a, b) => a.score - b.score);
}
```

**Step 5: Implement system, knowledge, timeline, trust**

Add:

```ts
function buildSystemHealth(data: SupabaseOpsConsoleData): OpsOverviewSystemHealth {
  const worker = data.workerHeartbeats[0];
  const host = data.hostStatuses[0];
  const openclaw = data.openclawStatuses[0];
  const health = data.dataSource.sourceHealth;

  const workerItem: OpsOverviewHealthItem = {
    status: !worker ? "unknown" : worker.status === "online" && isFresh(worker.lastSeenAt) ? "online" : worker.status === "online" ? "stale" : worker.status === "error" ? "warning" : "offline",
    label: worker?.workerName || "Worker",
    detail: worker ? `${worker.machine} · ${worker.status}` : "heartbeat waiting",
    lastSeenAt: worker?.lastSeenAt,
    targetSection: "worker",
  };

  return {
    worker: workerItem,
    macMini: {
      status: host && isFresh(host.createdAt) ? "online" : host ? "stale" : "unknown",
      label: "Mac mini",
      detail: host ? `${host.machine} reporting` : "host status waiting",
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
      status: data.github.repos.length ? "online" : "unknown",
      label: "GitHub",
      detail: `${data.github.repos.length} repos · ${data.github.releases.length} releases`,
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

function buildKnowledgeSnapshot(data: SupabaseOpsConsoleData): OpsOverviewKnowledgeSnapshot {
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
      orphanNotes: data.vault.orphanNoteIds.length,
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

function buildOperationsTimeline(data: SupabaseOpsConsoleData): OpsOverviewTimelineItem[] {
  const items: OpsOverviewTimelineItem[] = [
    ...data.syncRequests.map((request) => ({
      id: `sync-${request.id}`,
      kind: "sync" as const,
      status: mapTimelineStatus(request.status),
      title: `Sync ${request.requestType}`,
      detail: request.message || request.status,
      source: "ops_sync_requests",
      occurredAt: request.requestedAt,
      target: { section: "worker" as const, id: request.id },
    })),
    ...data.agentRuns.map((run) => ({
      id: `agent-run-${run.id}`,
      kind: "agent_run" as const,
      status: mapTimelineStatus(run.status),
      title: run.title || "Agent run",
      detail: run.status,
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
  ];

  return byUpdatedAtDesc(items.map((item) => ({ ...item, updatedAt: item.occurredAt }))).slice(0, 12);
}

function buildDataTrust(data: SupabaseOpsConsoleData): OpsOverviewDataTrust {
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
    generatedAt: data.dataSource.generatedAt,
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
```

**Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: fix import/type mismatches until pass.

**Step 7: Commit**

```bash
git add lib/ops/overview.ts lib/ops/types.ts
git commit -m "feat(ops): build overview decision model"
```

---

## Task 3: Add authenticated overview API route

**Files:**
- Create: `app/api/ops/overview/route.ts`
- Inspect: `app/api/ops/worker/status/route.ts`
- Inspect: `lib/ops/auth.ts`

**Step 1: Follow existing auth pattern**

Inspect an existing authenticated route and mirror its access check.

**Step 2: Create route**

Create `app/api/ops/overview/route.ts`:

```ts
import { NextResponse } from "next/server";
import { assertOpsAccess } from "@/lib/ops/auth";
import { getSupabaseOpsConsoleData } from "@/lib/ops/supabase-data";
import { buildOpsOverviewModel } from "@/lib/ops/overview";

export async function GET() {
  const access = await assertOpsAccess();
  if (access) return access;

  const data = await getSupabaseOpsConsoleData();
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Ops data source is unavailable." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    overview: buildOpsOverviewModel(data),
  });
}
```

If `assertOpsAccess` does not exist, adapt to the actual helper exported by `lib/ops/auth.ts`.

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: pass.

**Step 4: API smoke**

Start dev server if needed:

```bash
npm run dev -- -p 3010
```

Authenticate via existing `/api/ops/auth` flow, then call:

```bash
curl -s http://localhost:3010/api/ops/overview | jq '.ok, .overview.command, (.overview.actions | length)'
```

Expected:

```text
true
{ command object }
number >= 1 in current dataset
```

**Step 5: Commit**

```bash
git add app/api/ops/overview/route.ts
git commit -m "feat(ops): add overview summary api"
```

---

## Task 4: Add Overview v2 UI helpers/components

**Files:**
- Modify: `components/ops/sections/OverviewSection.tsx`
- Optional modify: `components/ops/shared.tsx`

**Step 1: Add local helper maps in `OverviewSection.tsx`**

At the top of `OverviewSection.tsx`, import overview builder and model type:

```ts
import { buildOpsOverviewModel } from "@/lib/ops/overview";
import type {
  OpsOverviewActionItem,
  OpsOverviewHealthItem,
  OpsOverviewProjectHealth,
  OpsOverviewSeverity,
  OpsOverviewTimelineItem,
} from "@/lib/ops/types";
```

Add style helpers:

```ts
const severityTone: Record<OpsOverviewSeverity, string> = {
  critical: "border-rose-300/40 bg-rose-400/10 text-rose-50",
  warning: "border-amber-300/40 bg-amber-400/10 text-amber-50",
  info: "border-cyan-300/35 bg-cyan-400/10 text-cyan-50",
  healthy: "border-emerald-300/35 bg-emerald-400/10 text-emerald-50",
  empty: "border-slate-300/25 bg-slate-400/10 text-slate-100",
};

function healthTone(status: string) {
  if (["risk", "critical", "offline", "failed"].includes(status)) return severityTone.critical;
  if (["attention", "warning", "stale", "queued", "running"].includes(status)) return severityTone.warning;
  if (["healthy", "online", "completed"].includes(status)) return severityTone.healthy;
  return severityTone.empty;
}
```

**Step 2: Add small local card components**

Inside the file, before `OverviewSection`, add:

```tsx
function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", tone)}>{label}</span>;
}

function ActionCard({ action, onOpen }: { action: OpsOverviewActionItem; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={clsx("w-full rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/10", severityTone[action.severity])}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusPill label={action.category} tone="border-white/15 bg-black/20 text-white/75" />
        <span className="text-xs opacity-70">{action.source.table}</span>
      </div>
      <h4 className="text-base font-bold text-white">{action.title}</h4>
      <p className="mt-2 text-sm text-white/70">{action.reason}</p>
      <p className="mt-4 text-sm font-semibold text-white">{action.cta} →</p>
    </button>
  );
}

function HealthTile({ item }: { item: OpsOverviewHealthItem }) {
  return (
    <div className={clsx("rounded-2xl border p-4", healthTone(item.status))}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="text-white">{item.label}</strong>
        <StatusPill label={item.status} tone={healthTone(item.status)} />
      </div>
      <p className="text-sm text-white/70">{item.detail}</p>
      <p className="mt-2 text-xs text-white/45">{formatDateTime(item.lastSeenAt)}</p>
    </div>
  );
}

function ProjectHealthCard({ project, onOpen }: { project: OpsOverviewProjectHealth; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={clsx("rounded-3xl border bg-black/20 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10", healthTone(project.health))}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-white">{project.name}</h4>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{project.stage}</p>
        </div>
        <StatusPill label={`${project.score}`} tone={healthTone(project.health)} />
      </div>
      <p className="text-sm text-white/75">{project.diagnosis}</p>
      <p className="mt-3 text-sm font-semibold text-white">{project.nextAction}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full bg-white/10 px-3 py-1">tasks {project.counts.tasks}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">verify {project.counts.verifyingTasks}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">docs {project.counts.notes}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">AI review {project.counts.aiReviews}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">GitHub {project.signals.githubRisk}</span>
      </div>
    </button>
  );
}

function TimelineRow({ item }: { item: OpsOverviewTimelineItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-white">{item.title}</strong>
        <StatusPill label={item.status} tone={healthTone(item.status)} />
      </div>
      <p className="mt-2">{item.detail}</p>
      <p className="mt-2 text-xs text-white/45">{item.source} · {formatDateTime(item.occurredAt)}</p>
    </div>
  );
}
```

**Step 3: Compute overview at start of component**

Inside `OverviewSection`, add:

```ts
const overview = buildOpsOverviewModel(data);
```

**Step 4: Replace top half of JSX first**

Replace current Hero + SynapseMap + Summary metrics with:

```tsx
<header className={clsx("rounded-[2rem] border p-6 shadow-2xl shadow-black/20", healthTone(overview.command.status))}>
  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <StatusPill label={overview.command.status} tone={healthTone(overview.command.status)} />
    <span className="text-xs text-white/50">source {overview.source.mode} · updated {formatDateTime(overview.generatedAt)}</span>
  </div>
  <h2 className="mb-3 text-3xl font-bold md:text-4xl">{overview.command.title}</h2>
  <p className="max-w-3xl text-white/70">{overview.command.summary}</p>
  {overview.command.primaryAction && (
    <button
      onClick={() => setSection(overview.command.primaryAction!.targetSection)}
      className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100"
    >
      {overview.command.primaryAction.label}
    </button>
  )}
</header>

<Panel title="Today Action Queue">
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {overview.actions.map((action) => (
      <ActionCard key={action.id} action={action} onOpen={() => setSection(action.target.section)} />
    ))}
    {!overview.actions.length && <EmptyLine message="오늘 바로 처리해야 할 운영 액션이 없습니다." />}
  </div>
</Panel>
```

**Step 5: Replace remaining layout with v2 sections**

Add after Action Queue:

```tsx
<Panel title="Project Operating Radar">
  <div className="grid gap-4 lg:grid-cols-2">
    {overview.projects.map((project) => (
      <ProjectHealthCard
        key={project.projectId}
        project={project}
        onOpen={() => {
          setSelectedProjectId(project.projectId);
          setSection("projects");
        }}
      />
    ))}
  </div>
</Panel>

<Panel title="System Health Strip">
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    {Object.values(overview.system).map((item) => (
      <button key={item.label} onClick={() => setSection(item.targetSection)} className="text-left">
        <HealthTile item={item} />
      </button>
    ))}
  </div>
</Panel>

<div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
  <Panel title="Knowledge / CMS Snapshot">
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <SummaryCard label="Notes" value={String(overview.knowledge.coverage.totalNotes)} />
      <SummaryCard label="Linked" value={String(overview.knowledge.coverage.projectLinkedNotes)} />
      <SummaryCard label="Orphan" value={String(overview.knowledge.coverage.orphanNotes)} />
    </div>
    <div className="flex flex-wrap gap-2">
      {overview.knowledge.buckets.map((bucket) => (
        <span key={bucket.id} className={clsx("rounded-full border px-3 py-2 text-xs", bucket.status === "healthy" ? severityTone.healthy : severityTone.empty)}>
          {bucket.label} · {bucket.count}
        </span>
      ))}
    </div>
    {!!overview.knowledge.missing.length && (
      <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-50">
        <strong>누락된 CMS 버킷</strong>
        <ul className="mt-2 space-y-1 text-white/70">
          {overview.knowledge.missing.map((item) => <li key={item.id}>• {item.reason}</li>)}
        </ul>
      </div>
    )}
  </Panel>

  <Panel title="Recent Operations Timeline">
    <div className="space-y-3">
      {overview.timeline.map((item) => <TimelineRow key={item.id} item={item} />)}
    </div>
  </Panel>
</div>

<Panel title="Data Trust Footer">
  <div className="grid gap-4 md:grid-cols-3">
    {overview.dataTrust.tables.map((table) => (
      <div key={table.name} className={clsx("rounded-2xl border p-4", table.status === "ok" ? severityTone.healthy : severityTone.empty)}>
        <p className="text-xs uppercase tracking-[0.18em] text-white/45">{table.name}</p>
        <p className="mt-2 text-2xl font-bold text-white">{table.count ?? 0}</p>
        <p className="text-xs text-white/50">{table.status}</p>
      </div>
    ))}
  </div>
  {!!overview.dataTrust.warnings.length && (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
      {overview.dataTrust.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
    </div>
  )}
</Panel>
```

**Step 6: Remove unused imports**

Remove now-unused imports from `OverviewSection.tsx`, especially:

- `GitHubRepoCard`
- `ReleaseCard`
- `SynapseMap`
- `SynapseNode`
- `TaskRow`
- `noteTypeMeta`

Only keep what the v2 UI uses.

**Step 7: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: pass.

**Step 8: Commit**

```bash
git add components/ops/sections/OverviewSection.tsx
git commit -m "feat(ops): redesign overview as action command center"
```

---

## Task 5: Browser QA and API verification

**Files:**
- No production file changes expected
- Optional temp scripts under `/tmp`

**Step 1: Start dev server**

```bash
npm run dev -- -p 3010
```

**Step 2: API smoke**

Authenticate, then run:

```bash
curl -s http://localhost:3010/api/ops/overview | jq '{ok, command: .overview.command, actions: (.overview.actions | length), projects: (.overview.projects | length), empty: .overview.dataTrust.emptyButExpected}'
```

Expected in current dataset:

```text
ok=true
actions >= 1
projects = 4
empty includes ops_worklogs, ops_artifacts, ops_ai_reviews
```

**Step 3: Browser QA**

Use Playwright or manual browser check:

- Authenticate `/ops`
- Confirm first visible section is Command Header
- Confirm `Today Action Queue` appears above Project Radar
- Confirm `Project Operating Radar` cards show health/diagnosis/next action
- Confirm `System Health Strip` shows Worker/Mac mini/OpenClaw/Supabase/GitHub
- Confirm `Knowledge / CMS Snapshot` shows bucket counts and empty worklog/artifact state
- Confirm `Data Trust Footer` shows table counts
- Click all 9 sidebar pages and ensure no hydration errors

**Step 4: Full gates**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all pass.

**Step 5: Commit if QA causes fixes**

```bash
git add <changed-files>
git commit -m "fix(ops): polish overview command center qa findings"
```

---

## Task 6: Final report

Report with this structure:

```markdown
## 완료
- Added overview decision model
- Added `/api/ops/overview`
- Rebuilt Overview as Action Command Center

## 검증
- typecheck: pass
- lint: pass
- build: pass
- browser QA: pass/fail with notes
- API smoke: pass/fail with sample counts

## 달라진 점
- Before: data-first synapse dashboard
- After: action-first admin/CMS command center

## 남은 작업
- action dismiss/resolve persistence
- real agent execution wiring
- AI review generation pipeline
- worklog/artifact ingestion
```
