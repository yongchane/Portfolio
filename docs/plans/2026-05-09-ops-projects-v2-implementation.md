# Ops Projects v2 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `/ops` Projects as a Project Mission Control page with project health, action queue, and AI Review Board v2.

**Architecture:** Add a reusable project decision builder in `lib/ops/projects.ts` that derives project rail cards, command state, action queue, AI review columns, evidence groups, and data trust from `OpsConsoleData`. Refactor `components/ops/sections/ProjectsSection.tsx` to render model-driven command cards while preserving existing project edit/save behavior and existing GitHub/task/docs evidence.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Supabase-backed ops data loader, existing `/ops` auth/session helpers.

---

## Pre-flight

**Branch:** `develop`

**Do not modify:**
- Supabase schema for this task
- Agent real execution policy
- Other `/ops` pages except shared utilities if strictly necessary
- `main` branch

**Existing design doc:**
- `docs/plans/2026-05-09-ops-projects-v2-design.md`

**Useful existing files:**
- `components/ops/sections/ProjectsSection.tsx`
- `components/ops/sections/types.ts`
- `components/ops/OpsConsole.tsx`
- `components/ops/shared.tsx`
- `components/ops/utils.ts`
- `lib/ops/types.ts`
- `lib/ops/selectors.ts`
- `lib/ops/overview.ts`
- `app/api/ops/ai-reviews/route.ts`
- `app/api/ops/agent-runs/route.ts`

### Task 0: Baseline check

**Files:** none

**Step 1: Verify branch/status**

```bash
cd /Users/hyeon-yongchan/Desktop/Portfolio
git branch --show-current
git status --short
```

Expected:
- branch is `develop`
- status may contain prior intentional Overview/runtime changes, but no unexpected edits to Projects files before this task

**Step 2: Run baseline checks**

```bash
npm run typecheck
npm run lint
npm run ops:doctor
```

Expected: PASS.

---

## Task 1: Define Project Mission Control model types

**Files:**
- Modify: `lib/ops/types.ts`

**Step 1: Add project command model types near existing overview model types**

Add:

```ts
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
    workflowRuns: OpsConsoleData["github"]["workflowRuns"];
    failedWorkflowRuns: OpsConsoleData["github"]["workflowRuns"];
    securityAlerts: OpsConsoleData["github"]["securityAlerts"];
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
```

If direct references to `GitHubRepoSnapshot` and `GitHubProjectBoardSnapshot` create ordering/import concerns, use existing exported type names in `lib/ops/types.ts` after confirming definitions are in the same file.

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

**Step 3: Commit**

```bash
git add lib/ops/types.ts
git commit -m "feat(ops): define projects command model types"
```

---

## Task 2: Build project decision model

**Files:**
- Create: `lib/ops/projects.ts`

**Step 1: Create builder file**

Implement helper functions:

```ts
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
  OpsProjectEvidence,
  OpsProjectModel,
  OpsProjectRailItem,
  Project,
  Task,
} from "@/lib/ops/types";
import {
  getProjectBoardsForRepo,
  getProjectExecutionStatus,
  getProjectLinkedNotesCount,
  getProjectNextActions,
  getProjectReleases,
  getProjectTasks,
  getSelectedProjectNotes,
  getSelectedRepo,
} from "@/lib/ops/selectors";
```

Core constants:

```ts
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
```

Required exported function:

```ts
export function buildOpsProjectModel(args: {
  data: OpsConsoleData;
  selectedProject: Project;
  githubReposByName: Map<string, GitHubRepoSnapshot>;
  projectBoardsByOwner: Map<string, GitHubProjectBoardSnapshot[]>;
}): OpsProjectModel {
  // derive selected repo, project tasks, notes, releases, workflow runs, security alerts
  // derive ai review columns
  // derive action queue
  // derive command + rail + dataTrust
}
```

**Step 2: Implement scoring**

Use the design rules:

- start at 100
- blocked task: `-30`
- verifying task: `-12`
- each high open AI review: `-20`
- each medium open AI review: `-10`
- each missing AI review category: `-5`
- failed/cancelled workflow run: `-15`
- open security alert: `-25`
- linked docs missing: `-10`
- repo missing: `-8`
- live/verifying project with no release: `-8`

Clamp score to `0..100`.

Status:

```ts
score < 60 ? "risk" : score < 85 ? "attention" : "healthy"
```

**Step 3: Implement action queue**

Add actions in priority order:

1. security alert / failed CI
2. blocked task
3. high/medium open AI review
4. verifying task
5. missing review category
6. docs/release/repo missing

Return top 10 actions.

**Step 4: Implement AI review columns**

For each category:

- count open/resolved/ignored
- highest severity among open reviews
- status:
  - `risk` if high/medium open review exists
  - `covered` if any review exists
  - `missing` if none
- sort reviews by severity then updated/created time

**Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

**Step 6: Commit**

```bash
git add lib/ops/projects.ts
git commit -m "feat(ops): build projects mission control model"
```

---

## Task 3: Refactor Projects section to model-driven layout

**Files:**
- Modify: `components/ops/sections/ProjectsSection.tsx`

**Step 1: Import builder and model types**

Add imports:

```ts
import { buildOpsProjectModel } from "@/lib/ops/projects";
import type {
  OpsProjectActionItem,
  OpsProjectAiReviewColumn,
  OpsProjectRailItem,
} from "@/lib/ops/types";
```

**Step 2: Build model in component**

Inside `ProjectsSection`, add:

```ts
const projectBoardsByOwner = useMemo(() => {
  const map = new Map<string, typeof data.github.projectBoards>();
  for (const board of data.github.projectBoards) {
    const boards = map.get(board.owner) || [];
    boards.push(board);
    map.set(board.owner, boards);
  }
  return map;
}, [data.github.projectBoards]);

const projectModel = useMemo(
  () =>
    buildOpsProjectModel({
      data,
      selectedProject,
      githubReposByName,
      projectBoardsByOwner,
    }),
  [data, selectedProject, githubReposByName, projectBoardsByOwner],
);
```

If `projectBoardsByOwner` already exists in `OpsConsole`, prefer passing it via props only if necessary. For minimal change, local derivation is acceptable.

**Step 3: Add UI helpers**

Add local components:

- `ProjectStatusPill`
- `ProjectSelectorCard`
- `ProjectCommandHeader`
- `ProjectActionCard`
- `ProjectActionQueue`
- `AiReviewColumnCard`
- `ProjectDataTrustCard`

Keep styles aligned with Overview v2:

```ts
const projectStatusTone = {
  risk: "border-rose-300/40 bg-rose-400/10 text-rose-50",
  attention: "border-amber-300/40 bg-amber-400/10 text-amber-50",
  healthy: "border-emerald-300/35 bg-emerald-400/10 text-emerald-50",
} as const;
```

**Step 4: Replace top layout**

Change the top of returned JSX to:

```tsx
<header>...</header>
<div className="grid gap-6 xl:grid-cols-[320px_1fr]">
  <ProjectSelectorRail items={projectModel.rail} ... />
  <div className="space-y-6">
    <ProjectCommandHeader command={projectModel.command} selectedProject={selectedProject} />
    <ProjectActionQueue actions={projectModel.actions} />
    <AiReviewBoardV2 columns={projectModel.aiReviewBoard} />
    ...existing evidence/edit sections...
  </div>
</div>
```

**Step 5: Preserve existing save behavior**

Do not remove:

- `summaryDraft`
- `stageDraft`
- `checklistDraft`
- `saveProject()`
- PATCH `/api/ops/projects/[id]`

Move the save panel lower and title it `Project quick edit / source behavior`.

**Step 6: Preserve existing evidence**

Reuse existing panels but regroup them:

- Execution evidence: execution snapshot, checklist, sector, cadence, admin surfaces
- Work evidence: connected tasks
- GitHub evidence: repo, CI/security, boards, release
- Docs evidence: linked vault notes

**Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

**Step 8: Commit**

```bash
git add components/ops/sections/ProjectsSection.tsx
git commit -m "feat(ops): redesign projects mission control UI"
```

---

## Task 4: Polish AI Review Board v2 and empty states

**Files:**
- Modify: `components/ops/sections/ProjectsSection.tsx`
- Optionally Modify: `components/ops/shared.tsx` only if a small reusable card is clearly beneficial

**Step 1: Ensure category columns are clear**

Each AI review category must show:

- label/helper
- status pill
- open/resolved/ignored counts
- highest severity
- top reviews
- recommendation line if present
- missing state if no review exists

**Step 2: Add missing category actions**

If a category has no reviews, the empty state should say:

```text
아직 [category] 리뷰가 없습니다. Floating Agent Panel에서 이 프로젝트 기준 리뷰를 요청할 수 있게 연결 예정입니다.
```

**Step 3: Improve action cards**

Action queue cards should include:

- severity color
- category pill
- source table/id
- reason
- CTA text

**Step 4: Run checks**

```bash
npm run typecheck
npm run lint
```

Expected: PASS.

**Step 5: Commit**

```bash
git add components/ops/sections/ProjectsSection.tsx components/ops/shared.tsx
git commit -m "feat(ops): polish projects ai review board"
```

If `components/ops/shared.tsx` was not changed, omit it from `git add`.

---

## Task 5: Final verification and docs note

**Files:**
- Modify if needed: `docs/plans/2026-05-09-ops-projects-v2-implementation.md`

**Step 1: Run full verification**

```bash
npm run typecheck
npm run lint
npm run ops:doctor
npm run build
```

Expected:
- typecheck PASS
- lint PASS
- ops doctor PASS
- build PASS

Note: `npm run build` runs `npm run ops:sync-github` first and may update `data/ops/github-cache.json`. Treat that as expected if only GitHub cache timestamps/live signals changed.

**Step 2: Inspect git diff**

```bash
git status --short
git diff --stat
```

Expected:
- only intentional Projects v2/model/docs/cache changes remain

**Step 3: Commit final verification note if docs changed**

If this plan doc was updated with implementation notes:

```bash
git add docs/plans/2026-05-09-ops-projects-v2-implementation.md
git commit -m "docs(ops): record projects v2 verification"
```

**Step 4: Final report**

Report:

- commits created
- files changed
- verification commands and results
- known limitations
- whether next page can start
