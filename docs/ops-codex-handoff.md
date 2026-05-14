# /ops Codex handoff

Last updated: 2026-05-14 23:35 KST

Branch: `develop`

Repo: `https://github.com/yongchane/Portfolio.git`

## 1. Why this document exists

This document is the handoff note for continuing `/ops` work in Codex from the `develop` branch.

The goal is not to restart discovery. Codex should continue from the decisions already made:

- `/ops` is a personal operating console, not a simple dashboard.
- The correct direction is real backend/API/database integration, not hardcoded UI-only mockups.
- Any user-visible page should be judged by whether it can read/write operational state reliably.
- Frontend polish is useful only when the source-of-truth path is explicit.

## 2. Product direction

`/ops` should become a GitHub-like personal operating system for the portfolio/workspace.

Primary surfaces:

- Overview: current operational health and next actions.
- Projects: project mission control, repo linkage, execution state, AI review board, canvas/detail flow.
- Tasks: task execution and verification state.
- Docs/Vault: Obsidian/workspace notes, linked decisions, worklogs, evidence.
- Aeyong/OpenClaw/Mac mini: assistant/runtime/host status and worker visibility.
- Releases: shipped work, verification, release state.
- Settings: source health, sync state, operational configuration.

The design goal is inspectable operating state. Avoid building a pretty static admin screen that cannot explain where its data came from or how it can be changed.

## 3. Current architectural truth

The system is still hybrid/transitional.

Current model:

```text
local markdown / JSON / generated cache
        ↓ sync / scripts / partial APIs
Supabase ops tables
        ↓ server loaders / API routes
/ops UI
```

Important consequences:

- Local file edits do not automatically mean production `/ops` changed.
- A deployed `/ops` state is trustworthy only after the relevant sync/API write path succeeds.
- Some data still comes from seed/static JSON and generated caches.
- The target is DB/API-backed behavior, but the repo is not fully there yet.

When implementing new features, prefer this path:

```text
Supabase schema/table → server/API route → typed loader/adapter → UI fetch/render → mutation path → verification
```

Do not finish work by only adding hardcoded arrays, static props, or visual mock data unless the task explicitly says it is a mock-only prototype.

## 4. Work completed before this handoff

Known completed or previously verified work includes:

- `/ops` route split and shared shell direction.
- Projects page v2 direction: mission-control UI, project health, action queue, AI review board.
- Supabase sync foundation for projects/tasks/notes/worklogs/artifacts.
- `/api/ops/notes-version` source metadata.
- `PATCH /api/ops/tasks/[id]` and `PATCH /api/ops/projects/[id]` write paths.
- Runtime tables for worker, host, OpenClaw status, sync requests, agents, agent runs, AI reviews.
- Local smoke verification for several ops APIs and worker-safe stub paths.
- Browser QA previously covered 9 sidebar pages with no hydration errors after fixes.

Reference docs already in this repo:

- `docs/ops-supabase-sync.md`
- `docs/ops-mac-mini-worker.md`
- `docs/ops-automation-mac-mini.md`
- `docs/ops-ai-worklog-mvp.md`
- `docs/plans/2026-05-09-ops-personal-os-renewal.md`
- `docs/plans/2026-05-09-ops-routing-project-management-mock.md`
- `docs/plans/2026-05-09-ops-projects-v2-design.md`
- `docs/plans/2026-05-09-ops-projects-v2-implementation.md`

## 5. Current working tree at handoff time

At the time this handoff was written, the local `develop` working tree already contained uncommitted implementation changes outside this docs handoff:

Modified:

- `app/ops/projects/page.tsx`
- `components/ops/project-management/ProjectRepositoryListPage.tsx`
- `data/ops/github-cache.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`

Untracked:

- `apps/`
- `lib/ops/projects-api.ts`
- `scripts/seed-ops-mock-project.mjs`
- `tests/`
- `tsconfig.ops-api.json`

Codex should inspect these before continuing. They appear related to the next `/ops` project-management/API direction, but this document intentionally does not claim they are complete.

Recommended first commands:

```bash
git branch --show-current
git status --short
git diff --stat
git diff -- app/ops/projects/page.tsx components/ops/project-management/ProjectRepositoryListPage.tsx lib/ops/projects-api.ts
```

## 6. Working method we agreed on

Use this loop for `/ops` work:

1. Clarify the user-facing slice.
   - What page/flow changes?
   - What action should the user be able to perform?
   - What state must persist?
2. Design the data path first.
   - Supabase table/columns or existing table?
   - API route or server action?
   - Loader/adapter shape?
   - Local fallback needed or not?
3. Implement in thin vertical slices.
   - Schema/adapter first.
   - API contract second.
   - UI integration third.
   - Mutation/write path fourth.
4. Verify with evidence.
   - Typecheck/lint/build where relevant.
   - API smoke tests for backend changes.
   - Browser QA for user flows.
   - `ops:doctor` when Supabase/runtime health matters.
5. Document durable decisions.
   - Update docs when behavior/source-of-truth changes.
   - Do not leave important architecture decisions only in chat.

## 7. Engineering rules for Codex

Required defaults:

- Work on `develop`, not `main`.
- Keep changes small and reviewable.
- Do not remove the existing Supabase/local fallback behavior unless the task explicitly migrates it.
- Do not commit secrets or `.env` values.
- Do not treat generated GitHub/cache changes as product logic without checking the diff.
- Keep TypeScript models close to the API/adapter behavior.
- Preserve auth boundaries around `/ops` routes and ingest endpoints.

For substantial implementation, follow repo guidance in `AGENTS.md`:

- Prefer targeted code understanding before broad file reads.
- Run verification instead of relying on intuition.
- Inspect diffs before claiming completion.

## 8. Recommended next direction

### Priority 1 — Stabilize current uncommitted work

Before adding new scope, inspect the current local changes and decide whether they are:

- complete enough to verify and commit,
- partially correct but needing fixes,
- or experimental and should be split/parked.

Likely focus areas:

- `apps/ops-api/` NestJS API direction.
- `lib/ops/projects-api.ts` contract layer.
- project repository list changes.
- package/TypeScript configuration changes caused by the API app.

### Priority 2 — Make Project Management real

The project-management flow should move from mock/list/canvas toward a persisted model:

- repository registry table or existing project repo fields,
- add/remove repo mutation path,
- project detail/canvas model stored in DB or derived from repo/project/task state,
- API contract tests,
- UI optimistic state and error states.

### Priority 3 — Wire agent/review actions safely

The AI Review Board and Floating Agent Panel should not pretend real execution exists until wired.

Next safe milestone:

- create review request records,
- show pending/needs-approval/running/completed states,
- keep real OpenClaw/ACP execution behind explicit approval,
- store outputs as worklogs/artifacts/AI reviews.

### Priority 4 — Reduce hybrid source-of-truth risk

Pick one domain and fully migrate it:

- Projects, or
- Tasks, or
- Notes/worklogs, or
- Releases.

Success means that domain no longer depends on static JSON/cache as the primary write path.

## 9. Verification checklist for the next Codex run

Run the smallest relevant set first, then full gates before commit/push.

```bash
npm run typecheck
npm run lint
npm run ops:doctor
npm run build
```

For API/project-management work also run or add targeted tests such as:

```bash
node --test tests/ops-project-management-contract.test.mjs
```

Expected reporting format:

- files changed,
- contracts/API routes touched,
- commands run and results,
- known limitations,
- next recommended slice.

## 10. Definition of done for the next meaningful milestone

A `/ops` slice is done only when:

- the UI renders the intended state,
- the state has an explicit source of truth,
- mutations persist through an API/server path,
- fallback behavior is intentional and documented,
- verification commands pass or blockers are named,
- docs are updated if behavior changed.
