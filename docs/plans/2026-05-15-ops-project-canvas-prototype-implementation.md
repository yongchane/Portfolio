# /ops Project Canvas Prototype Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/ops/projects/new` add a GitHub cache repo into managed projects and route to a repo-aware IA/architecture canvas.

**Architecture:** Keep the first slice inside the current Next.js app. Extract pure project-management contract helpers so the same DTO behavior can move to a future NestJS `apps/ops-api`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Node test runner for pure contract tests, existing Supabase/local fallback ops mutation layer.

---

### Task 1: Contract Test

**Files:**
- Create: `tests/ops-project-management-contract.test.mjs`

**Steps:**
1. Write tests for stable project id generation, project creation from GitHub repo metadata, managed repo filtering, and canvas node generation.
2. Run `node --test tests/ops-project-management-contract.test.mjs`.
3. Expected: FAIL because the contract module does not exist yet.

### Task 2: Pure Contract Module

**Files:**
- Create: `lib/ops/project-management-contract.mjs`
- Modify: `components/ops/project-management/mock-data.ts`

**Steps:**
1. Implement framework-free helpers.
2. Re-export them through the existing `mock-data.ts` compatibility module.
3. Run the contract test.
4. Expected: PASS.

### Task 3: Add Project API

**Files:**
- Modify: `lib/ops/mutations.ts`
- Create: `app/api/ops/projects/route.ts`

**Steps:**
1. Add `addProjectFromGitHubRepo` with Supabase/local fallback behavior.
2. Add authenticated same-origin `POST /api/ops/projects`.
3. Run `npm run typecheck`.
4. Expected: PASS.

### Task 4: UI Integration

**Files:**
- Modify: `components/ops/project-management/GitHubRepositoryBrowserPage.tsx`
- Modify: `components/ops/project-management/ProjectRepositoryListPage.tsx`
- Modify: `components/ops/project-management/ProjectCanvasPage.tsx`

**Steps:**
1. Convert Add to Ops from link-only mock to client-side POST action.
2. Show whether a repo is already managed.
3. Use the contract canvas model.
4. Run `npm run lint`, `npm run typecheck`, and `npm run build`.

### Task 5: Repo Analyzer Prototype

**Files:**
- Modify: `lib/ops/project-management-contract.mjs`
- Create: `lib/ops/repo-analysis-server.ts`
- Modify: `app/ops/projects/[projectId]/page.tsx`
- Modify: `components/ops/project-management/ProjectCanvasPage.tsx`
- Modify: `components/ops/project-management/mock-data.ts`

**Analysis Standard:**
- IA is derived from routes, navigation surfaces, screen actions, and docs intent.
- Architecture is derived from API routes, components, domain services, storage/schema files, jobs, integrations, auth/security files, and deploy/config files.
- Every generated node should carry evidence through `codeRefs`, `meta`, and optional confidence data.
- Edges should describe practical relations such as `uses`, `calls`, `reads/writes`, `documents`, `authenticates`, `deploys`, `exports`, and `suggests`.

**Steps:**
1. Add `analyzeRepoStructure()` as a framework-free analyzer contract.
2. Add `buildCanvasModel()` so canvas nodes and edges can come from analyzer output instead of only static template nodes.
3. Generate local Portfolio repo analysis on the server for `/ops/projects/portfolio`.
4. Render analyzer edges in `ProjectCanvasPage`.
5. Extend tests to cover route, component, API, service, storage, docs, security, and job classification.

### Task 6: Canvas API Boundary

**Files:**
- Create: `app/api/ops/projects/[id]/canvas/route.ts`
- Modify: `lib/ops/project-management-contract.mjs`
- Modify: `components/ops/project-management/mock-data.ts`
- Modify: `tests/ops-project-management-contract.test.mjs`

**API Contract:**
- `GET /api/ops/projects/:id/canvas`
- Authenticated ops session required.
- Response includes `project`, `repo`, `canvas.nodes`, `canvas.edges`, analyzer `summary`, and `source`.
- Current implementation uses local Portfolio repo analysis when the managed project points at `yongchane/Portfolio`; future NestJS should swap this source for live GitHub tree/content analysis.

**Steps:**
1. Add `buildProjectCanvasResponse()` as the API-ready pure payload builder.
2. Add authenticated Next route handler for project canvas reads.
3. Keep local analyzer behind the route so the frontend can later fetch the same contract from NestJS.
4. Add contract coverage for the response shape.

### Task 7: Canvas Save API Boundary

**Files:**
- Create: `data/ops/project-canvas.json`
- Create: `lib/ops/project-canvas-store.ts`
- Modify: `app/api/ops/projects/[id]/canvas/route.ts`
- Modify: `lib/ops/project-management-contract.mjs`
- Modify: `components/ops/project-management/mock-data.ts`
- Modify: `tests/ops-project-management-contract.test.mjs`

**API Contract:**
- `PATCH /api/ops/projects/:id/canvas`
- Same-origin and authenticated ops session required.
- Accepts `canvas.nodes`, `canvas.edges`, and optional `summary`.
- Sanitizes node/edge payload before persistence.
- Stores to local JSON fallback for the prototype; future NestJS/Supabase should keep the same payload shape.

**Steps:**
1. Add `sanitizeCanvasPayload()` to constrain saveable canvas data.
2. Add local JSON canvas store for prototype persistence.
3. Make `GET /api/ops/projects/:id/canvas` return saved canvas when available, otherwise analyzer output.
4. Add `PATCH /api/ops/projects/:id/canvas` to save user-edited canvas state.
5. Verify by HTTP with authenticated `GET -> PATCH -> GET` flow.

### Task 8: Live GitHub API and Supabase Canvas Store

**Files:**
- Create: `lib/ops/github-live.ts`
- Create: `app/api/ops/github/repositories/[owner]/[repo]/tree/route.ts`
- Create: `app/api/ops/github/repositories/[owner]/[repo]/content/route.ts`
- Modify: `lib/ops/project-canvas-store.ts`
- Modify: `supabase/ops-schema.sql`

**API Contract:**
- `GET /api/ops/github/repositories/:owner/:repo/tree?branch=:branch`
- `POST /api/ops/github/repositories/:owner/:repo/content`
- GitHub access uses the authenticated `gh` CLI for this prototype.
- Canvas persistence prefers Supabase table `ops_project_canvases` when ops data mode and diagnostics allow it, then falls back to `data/ops/project-canvas.json`.

**Steps:**
1. Fetch live GitHub recursive trees and analyze them with `analyzeRepoStructure()`.
2. Fetch selected file contents for richer import/API/docs extraction.
3. Return per-file content warnings instead of failing the whole content request.
4. Add Supabase schema for project canvas persistence.
5. Verify live GitHub tree/content APIs against `yongchane/Portfolio` on `develop`.

### Task 9: Frontend API Hydration and Export

**Files:**
- Modify: `components/ops/project-management/ProjectCanvasPage.tsx`
- Modify: `lib/ops/project-management-contract.mjs`
- Create: `app/api/ops/projects/[id]/canvas/export/route.ts`

**Frontend Contract:**
- Project canvas page hydrates from `GET /api/ops/projects/:id/canvas`.
- User-edited nodes/edges save through `PATCH /api/ops/projects/:id/canvas`.
- Markdown export uses backend-generated markdown for consistent Obsidian/team docs output.
- PNG export renders the current browser canvas state to a downloadable image.

**Steps:**
1. Replace static-only canvas state with API hydration and fallback to local analyzer output.
2. Wire `Canvas 저장` to `PATCH /api/ops/projects/:id/canvas`.
3. Wire `Markdown Export` to `POST /api/ops/projects/:id/canvas/export`.
4. Add client-side PNG export for the current canvas.
5. Run contract tests, typecheck, lint, build, and authenticated HTTP smoke checks.

### Task 10: NestJS Ops API Scaffold

**Files:**
- Create: `apps/ops-api/**`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `.gitignore`
- Modify: `eslint.config.mjs`

**Backend Contract:**
- Keep the same DTO shape as the Next API routes.
- Provide a standalone NestJS server for canvas reads/saves/export and live GitHub tree/content analysis.
- Use the shared framework-free contract module as the source of truth.
- Prefer Supabase `ops_project_canvases` when configured, otherwise use local JSON fallback.

**Implemented Routes:**
- `GET /health`
- `GET /ops/projects/:id/canvas`
- `PATCH /ops/projects/:id/canvas`
- `POST /ops/projects/:id/canvas/export`
- `GET /ops/github/repositories/:owner/:repo/tree?branch=:branch`
- `POST /ops/github/repositories/:owner/:repo/content`

**Verification:**
- `npm run ops-api:build`
- Standalone smoke against `http://localhost:4010`:
  - health 200
  - canvas 200 with 26 nodes / 31 edges
  - patch 200
  - export 200
  - GitHub tree 200 with 651 files / 8 routes
  - GitHub content 200 with 2 fetched files / 1 warning / 4 imports

### Task 11: Next-to-Nest API Proxy

**Files:**
- Create: `lib/ops/ops-api-proxy.ts`
- Modify: `app/api/ops/projects/[id]/canvas/route.ts`
- Modify: `app/api/ops/projects/[id]/canvas/export/route.ts`
- Modify: `app/api/ops/github/repositories/[owner]/[repo]/tree/route.ts`
- Modify: `app/api/ops/github/repositories/[owner]/[repo]/content/route.ts`

**Runtime Contract:**
- When `OPS_API_BASE_URL` or `PORTFOLIO_OPS_API_BASE_URL` is set, authenticated Next API routes proxy to NestJS.
- The browser can keep calling `/api/ops/...`; Next acts as a BFF/auth boundary.
- Proxied responses include `x-ops-backend-source: nest` so integration tests can prove NestJS handled the backend response.
- If the env var is not set, the existing in-Next fallback implementation still works.

**Verified Runtime:**
- NestJS: `OPS_API_PORT=4010 npm run ops-api:start`
- Next proxy: `OPS_API_BASE_URL=http://localhost:4010 PORT=3012 npm run dev`
- Next-authenticated smoke through `/api/ops/...`:
  - canvas 200, backend `nest`, source `repo-analysis`, 26 nodes, 31 edges
  - patch 200, backend `nest`, source `saved-canvas`, 3 saved nodes
  - export 200, backend `nest`, filename `portfolio-canvas.md`, markdown bytes 11306
  - GitHub tree 200, backend `nest`, repo `yongchane/Portfolio`, branch `develop`, 651 files, 8 routes
  - GitHub content 200, backend `nest`, fetched `app/ops/projects/page.tsx` and `README.md`, 1 warning, 4 imports

### Task 12: Nest Primary Data Source Upgrade

**Files:**
- Modify: `apps/ops-api/src/services/ops-data.service.ts`
- Modify: `apps/ops-api/src/services/github-live.service.ts`
- Modify: `apps/ops-api/src/services/local-repo-analysis.service.ts`
- Modify: `apps/ops-api/src/project-canvas.controller.ts`
- Modify: `apps/ops-api/src/health.controller.ts`

**Backend Contract:**
- If Supabase env is configured, NestJS reads `ops_projects` and `ops_tasks` from Supabase.
- If Supabase env is missing, NestJS falls back to `data/ops/projects.json` and `data/ops/tasks.json`.
- Canvas analysis now uses live GitHub tree/content for project repos beyond `yongchane/Portfolio`.
- `GET /health` reports whether projects/tasks/canvas are using Supabase or local JSON fallback.

**Verified Runtime:**
- `portfolio`: backend `nest`, source `repo-analysis`, 26 nodes, 31 edges, 175 files, 8 routes.
- `pawpong`: backend `nest`, source `repo-analysis`, 13 nodes, 6 edges, 154 GitHub files, 35 files with content, auth/docs/config signals.
- `tori-house`: backend `nest`, source `repo-analysis`, 14 nodes, 7 edges, 58 GitHub files, 23 files with content, components/services/jobs signals.
- Supabase DB runtime could not be verified in this local session because Supabase env vars are not configured.
