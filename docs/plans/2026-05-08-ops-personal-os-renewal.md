# /ops Personal OS Renewal Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Renew Portfolio `/ops` into a production-first Personal OS with AI review, Docs/Vault library UX, Mac mini worker status, OpenClaw/Aeyong status, and floating Agent access.

**Architecture:** The deployed site must read runtime data from Supabase, not from Mac mini local files. Mac mini runs a Node worker that pushes host/OpenClaw/worklog/agent-run results into Supabase and processes queued requests created by `/ops`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase JS, existing `/ops` server loader, local Node scripts for Mac mini worker.

---

## Context the implementer must preserve

- Work only on `develop`. Do not touch or merge `main`.
- Important deployment correction: existing `GET /api/ops/openclaw` currently runs diagnostics on the server executing the deployed Next app. On Vercel/production, that is **not** the Mac mini. Production Mac mini/OpenClaw status must come from rows pushed by the Mac mini worker into Supabase, not from direct local diagnostics in the deployed server.
- Important ingest correction: existing `POST /api/ops/ingest` can write local JSON/markdown only on hosts that actually have the workspace. On Vercel this filesystem is ephemeral/not the Mac mini. Production worklog/state updates should be DB-first into Supabase; Mac mini file mirrors must be handled by the Mac mini worker.
- Primary product spec: `docs/ops/personal-os-renewal-spec.md`.
- Existing sync docs: `docs/ops-supabase-sync.md`, `docs/ops-ai-worklog-mvp.md`, `docs/ops-automation-mac-mini.md`.
- Existing `/ops` files:
  - `app/ops/page.tsx`
  - `components/ops/OpsConsole.tsx`
  - `components/ops/sections/*`
  - `lib/ops/types.ts`
  - `lib/ops/data.ts`
  - `lib/ops/supabase-data.ts`
  - `supabase/ops-schema.sql`
- Production requirement: `hyunyongchan.kr/ops` must work from anywhere using Supabase-backed data. Any local direct file reads are fallback/development only.
- Docker/Nginx/advanced network control are not MVP.

---

## Pre-flight checklist

### Task 0.1: Verify clean develop branch

**Files:** none

**Step 1: Check branch/status**

```bash
cd /Users/hyeon-yongchan/Desktop/Portfolio
git branch --show-current
git status --short
```

Expected:
- branch is `develop`
- status is clean or only intentional planning docs are modified

**Step 2: Run baseline checks**

```bash
npm run lint
npm run typecheck
```

Expected: PASS before functional edits. If baseline fails, record exact failures before changing code.

---

## Phase 1 — Schema and Type Foundation

### Task 1: Extend Supabase schema for production-first worker/agent/review data

**Files:**
- Modify: `supabase/ops-schema.sql`
- Modify: `lib/ops/types.ts`

**Required tables:**
- `ops_worker_heartbeats`
- `ops_host_status`
- `ops_openclaw_status`
- `ops_sync_requests`
- `ops_agents`
- `ops_agent_runs`
- `ops_ai_reviews`

**Step 1: Add SQL tables and indexes**

Add SQL from `docs/ops/personal-os-renewal-spec.md` section `5. Backend Tables / API Draft`.

**Step 2: Add TypeScript types**

Add domain types:

```ts
export type OpsWorkerStatus = "online" | "offline" | "error" | "stale";
export type OpsSyncRequestStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type OpsAgentRole = "manager" | "qa" | "security" | "uiux" | "docs" | "github" | "coding";
export type OpsAgentRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "needs_approval";
export type OpsAiReviewCategory = "qa" | "security" | "feature" | "update" | "uiux";
export type OpsAiReviewStatus = "open" | "resolved" | "ignored";
```

Then add record types matching the schema.

**Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

**Step 4: Commit**

```bash
git add supabase/ops-schema.sql lib/ops/types.ts
git commit -m "feat(ops): add worker agent review data model"
```

---

## Phase 2 — Supabase Data Loader and APIs

### Task 2: Load worker/host/openclaw/agent/review data into OpsConsoleData

**Files:**
- Modify: `lib/ops/types.ts`
- Modify: `lib/ops/supabase-data.ts`
- Modify: `lib/ops/data.ts`
- Possibly modify: `lib/ops/sources/static.ts`

**Step 1: Extend `OpsConsoleData`**

Add optional/defaulted arrays/objects:
- `worker`
- `hostStatus`
- `openclawStatusPushed`
- `agents`
- `agentRuns`
- `aiReviews`
- `syncRequests`

Keep local fallback safe with empty arrays/nulls.

**Step 2: Implement Supabase reads**

Read latest rows:
- latest worker heartbeat per worker
- latest host status per machine
- latest OpenClaw status per machine
- latest sync requests
- agents
- recent agent runs
- open AI reviews

**Step 3: Verify fallback**

Run without Supabase env if possible and ensure UI/data loader does not crash.

```bash
npm run typecheck
npm run lint
```

Expected: PASS.

**Step 4: Commit**

```bash
git add lib/ops
git commit -m "feat(ops): load worker agent and review state"
```

---

### Task 3: Add production-safe API routes

**Files:**
- Create: `app/api/ops/sync-requests/route.ts`
- Create: `app/api/ops/agent-runs/route.ts`
- Create: `app/api/ops/agents/route.ts`
- Create: `app/api/ops/ai-reviews/route.ts`
- Create: `app/api/ops/worker/status/route.ts`
- Create: `app/api/ops/host-status/route.ts`
- Create: `app/api/ops/openclaw-status/route.ts`

**Rules:**
- These routes must read/write Supabase, not Mac mini local files.
- Protect write routes with existing `/ops` auth or server token pattern.
- Never expose secrets.

**Step 1: Implement `POST /api/ops/sync-requests`**

Payload:

```json
{ "type": "worklogs" }
```

Creates queued row in `ops_sync_requests`.

**Step 2: Implement `POST /api/ops/agent-runs`**

Payload:

```json
{
  "agentId": "aeyong-manager",
  "projectId": "portfolio-ops",
  "prompt": "Summarize current project state",
  "scope": { "repo": "Portfolio", "branch": "develop" }
}
```

Creates queued row in `ops_agent_runs`.

**Step 3: Implement read routes**

Return latest status/review/run rows as JSON.

**Step 4: Typecheck/lint**

```bash
npm run lint
npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/api/ops
git commit -m "feat(ops): add queue and status api routes"
```

---

## Phase 3 — Mac mini Worker MVP

### Task 4: Create Mac mini ops worker script

**Files:**
- Create: `scripts/ops-mac-mini-worker.mjs`
- Modify: `package.json`
- Create: `docs/ops-mac-mini-worker.md`

**Worker responsibilities:**
- push heartbeat
- push host status
- push OpenClaw status summary
- process queued sync requests
- process queued agent runs in safe stub mode first

**Step 1: Add npm scripts**

```json
{
  "ops:worker": "node scripts/ops-mac-mini-worker.mjs",
  "ops:worker:once": "node scripts/ops-mac-mini-worker.mjs --once"
}
```

**Step 2: Implement `--once` mode first**

One run should:
- upsert worker heartbeat
- collect host status using Node `os` module
- optionally run read-only `openclaw gateway status` with timeout
- process at most one queued sync request and one queued agent run

**Step 3: Implement daemon loop**

Default mode loops every 15-30 seconds with safe backoff.

**Step 4: Safety**

- no destructive shell commands
- command allowlist only
- timeouts for every shell command
- service-role key only in environment

**Step 5: Verify locally**

```bash
npm run ops:worker:once
```

Expected: exits 0 and writes/updates Supabase rows if env is configured. If env missing, clear error message.

**Step 6: Commit**

```bash
git add scripts/ops-mac-mini-worker.mjs package.json docs/ops-mac-mini-worker.md
git commit -m "feat(ops): add mac mini worker MVP"
```

---

## Phase 4 — UI Renewal

### Task 5: Add Worker Status section/page

**Files:**
- Create: `components/ops/sections/WorkerSection.tsx`
- Modify: `components/ops/config.ts`
- Modify: `components/ops/OpsConsole.tsx`
- Modify: `components/ops/sections/types.ts`

**UI:**
- heartbeat status
- stale warning
- queue counts
- latest sync request
- latest failed job

**Checks:**

```bash
npm run typecheck
npm run lint
```

---

### Task 6: Add Mac mini Monitor section/page

**Files:**
- Create: `components/ops/sections/MacMiniSection.tsx`
- Modify: `components/ops/config.ts`
- Modify: `components/ops/OpsConsole.tsx`
- Modify: `components/ops/sections/types.ts`

**UI:**
- CPU/RAM/Disk/uptime
- worker process status
- OpenClaw gateway summary
- Docker hidden or marked future, not prominent

---

### Task 7: Add Projects AI Review Board

**Files:**
- Modify: `components/ops/sections/ProjectsSection.tsx`
- Possibly create: `components/ops/sections/ProjectAiReviewBoard.tsx`
- Modify: `components/ops/sections/types.ts`

**UI categories:**
- QA
- Security
- Feature
- Update
- UI/UX

**Interactions:**
- show comments/evidence/recommendations
- status badge open/resolved/ignored
- lightweight CTA: create agent run / create task later

---

### Task 8: Renew Docs/Vault into library UX

**Files:**
- Modify: `components/ops/sections/NotesSection.tsx`
- Possibly create: `components/ops/sections/VaultLibraryLanding.tsx`

**Library buckets:**
- 기능명세서
- IA / User Flow
- AARRR
- AI 활용 기록
- OpenClaw 세팅 기록
- 프로젝트 회고
- 작업 로그
- 결정 기록
- 레퍼런스 분석

**Do not remove:** search, tags, folders, related notes.

---

### Task 9: Add Floating Agent Panel skeleton

**Files:**
- Create: `components/ops/agents/FloatingAgentPanel.tsx`
- Modify: `components/ops/OpsConsole.tsx`
- Possibly create: `components/ops/agents/AgentRunForm.tsx`

**UI:**
- persistent right/bottom button
- agent list
- current page/project context
- prompt input
- creates queued `ops_agent_runs`
- shows recent run statuses

---

## Phase 5 — Verification and Handoff

### Task 10: Full verification

**Commands:**

```bash
npm run lint
npm run typecheck
npm run build
```

Expected: PASS.

### Task 11: Manual QA checklist

- `/ops` loads when authenticated.
- Overview does not crash if new tables are empty.
- Projects shows AI Review Board even with no reviews.
- Docs/Vault library buckets are usable.
- Worker Status shows stale/empty state gracefully.
- Mac mini Monitor shows empty/stale state gracefully.
- Floating Agent Panel opens/closes and can create queued run when Supabase env exists.
- Docker is not prominent in MVP.

### Task 12: Final commit

```bash
git status --short
git log --oneline -5
git commit -m "feat(ops): renew personal os control surface"
```

Only commit if all checks pass.

---

## Codex handoff prompt template

Use this if delegating implementation to Codex.

```text
Goal:
Renew Portfolio /ops on develop into a production-first Personal OS control surface.

Materials / Context:
- Repo: /Users/hyeon-yongchan/Desktop/Portfolio
- Branch: develop only. Do not touch main.
- Product spec: docs/ops/personal-os-renewal-spec.md
- Implementation plan: docs/plans/2026-05-08-ops-personal-os-renewal.md
- Existing docs: docs/ops-supabase-sync.md, docs/ops-ai-worklog-mvp.md, docs/ops-automation-mac-mini.md
- Existing /ops implementation already has Overview/Projects/Tasks/Notes/Releases/Aeyong/Settings and Supabase sync foundation.

Success Criteria:
1. Deployed /ops architecture remains Supabase-first, not local-file-first.
2. Add backend schema/types/API support for worker status, host status, OpenClaw pushed status, sync requests, agents, agent runs, and AI reviews.
3. Add Mac mini worker MVP script for heartbeat/status/queue processing.
4. Add UI for Worker Status, Mac mini Monitor, Projects AI Review Board, Docs/Vault library UX, and Floating Agent Panel skeleton.
5. Docker/Nginx/advanced network control are not MVP.
6. npm run lint, npm run typecheck, and npm run build pass.

Constraints:
- Do not expose secrets/API keys in UI or files.
- Do not run destructive commands.
- Do not auto-deploy.
- Use small commits by phase.
- Preserve existing /ops behavior and fallback where possible.

Output Format:
- Brief summary of completed phases.
- Files changed.
- Verification commands and results.
- Known risks / follow-up tasks.
```
