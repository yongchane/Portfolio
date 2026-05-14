# 2026-05-14 /ops Codex next plan

> Purpose: give Codex a concrete continuation plan for the Portfolio `develop` branch.

## Objective

Continue `/ops` as a real operations console by stabilizing the current project-management/API work and then moving one vertical slice from mock/hybrid behavior toward DB/API-backed behavior.

## Starting point

Branch:

```bash
develop
```

Important handoff doc:

```bash
docs/ops-codex-handoff.md
```

Current local working tree may already include uncommitted code changes. Inspect before editing.

```bash
git status --short
git diff --stat
```

## Phase 0 — Triage existing local changes

### Goal

Understand and stabilize the already-present implementation changes before adding more scope.

### Inspect

```bash
git diff -- app/ops/projects/page.tsx

git diff -- components/ops/project-management/ProjectRepositoryListPage.tsx

git diff -- package.json tsconfig.json

find apps -maxdepth 4 -type f | sort

sed -n '1,220p' lib/ops/projects-api.ts

sed -n '1,220p' tests/ops-project-management-contract.test.mjs
```

### Decide

Classify the current work as one of:

1. **ready to complete** — fix small issues, verify, commit;
2. **partial but useful** — split into smaller commits;
3. **experimental** — park or revert only after explicit approval.

Do not silently discard user/agent work.

## Phase 1 — Verify the API contract direction

### Goal

If the current `apps/ops-api` and `lib/ops/projects-api.ts` changes are intentional, make the contract explicit and testable.

### Expected shape

- A typed project-management API contract exists in `lib/ops/projects-api.ts` or equivalent.
- The frontend does not directly depend on mock data when an API contract is available.
- Contract tests describe add/list/select project repository behavior.
- The NestJS app under `apps/ops-api/` is either clearly runnable or documented as experimental.

### Verification

```bash
node --test tests/ops-project-management-contract.test.mjs
npm run typecheck
npm run lint
```

If TypeScript config changes were added for the API app, also verify:

```bash
npx tsc --noEmit -p tsconfig.ops-api.json
```

## Phase 2 — Persist Project Repository Management

### Goal

Move `/ops/projects` repository management away from pure mock state.

### Preferred implementation path

1. Define storage model.
   - Prefer Supabase-backed `ops_projects` repo fields if enough.
   - If not enough, add/prepare a dedicated repository registry table only with an explicit migration doc.
2. Add server/API read path.
   - List managed repositories/projects.
   - Expose available GitHub cache repos separately from added/managed repos.
3. Add mutation path.
   - Add repo to Ops.
   - Remove/archive repo from Ops if safe.
   - Return updated typed state.
4. Update UI.
   - `ProjectRepositoryListPage` should render real managed repos.
   - Empty/loading/error states must be visible.
   - Mock labels should remain only where behavior is still intentionally fake.
5. Add tests.
   - Contract test for add/list behavior.
   - UI-level test if feasible, otherwise focused data/adapter tests.

### Definition of done

- User can add a repository into `/ops` through a real server/API path.
- Refreshing the page does not lose the added repository.
- The UI clearly distinguishes managed repos from GitHub cache candidates.
- Verification passes or blockers are documented.

## Phase 3 — Canvas/detail flow

### Goal

Make project detail/canvas useful without pretending full automation exists.

### Minimum useful behavior

- Canvas nodes are derived from real project/task/repo/review state where possible.
- Static demo nodes are clearly marked as placeholders.
- Selecting a node shows the source table/object or why it is placeholder-only.
- Future write actions are disabled or routed to a real API contract.

## Phase 4 — Agent/review integration after persistence

Only after repository/project persistence is stable:

- Connect Floating Agent Panel to create review request records.
- Show `needs_approval`, `queued`, `running`, `completed`, `failed` states.
- Keep real agent/OpenClaw execution behind explicit approval.
- Store outputs as `ops_ai_reviews`, `ops_worklogs`, and/or `ops_artifacts`.

## Guardrails

- Do not push directly to `main`.
- Do not hardcode new product data as the final implementation.
- Do not remove fallback paths without documenting the replacement.
- Do not commit secrets, local `.env`, browser profiles, or generated temp captures.
- Treat `data/ops/github-cache.json` as generated/live cache; inspect before committing.
- If `npm run build` changes GitHub cache, report that as expected only after checking the diff.

## Final report template

Use this at the end of the Codex run:

```md
## Summary
- ...

## Files changed
- ...

## Data/API behavior
- Source of truth:
- Read path:
- Write path:
- Fallback:

## Verification
- `npm run typecheck`: PASS/FAIL
- `npm run lint`: PASS/FAIL
- `npm run ops:doctor`: PASS/FAIL/SKIPPED + why
- `npm run build`: PASS/FAIL/SKIPPED + why
- targeted tests: PASS/FAIL

## Known limitations
- ...

## Next slice
- ...
```
