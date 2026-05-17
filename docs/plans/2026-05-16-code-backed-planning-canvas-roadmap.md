# Code-backed Planning Canvas Roadmap

> **For Codex:** This is the execution plan for merging a Manyfast-style planning editor with the current GitHub-backed project canvas. Future `/goal 다음 작업 진행해줘` requests should execute this plan sequentially.

## Product Goal

Build `/ops/projects` into a deploy-ready project management workspace where a project can start from either:

- **Idea-first:** PRD, feature specs, IA, user flow, wireframe, architecture, and agent tasks are generated from a plain-language project idea.
- **GitHub-first:** a connected GitHub repo is analyzed into PRD/spec/IA/architecture/user-flow drafts with code evidence, then managed on the same Figma-style canvas.

The final product should feel like:

```text
Manyfast-style AI planning editor
+ GitHub repo reverse engineering
+ architecture/system canvas
+ Supabase-backed persistence
+ NestJS backend API
+ Codex/agent execution context
```

## Current Baseline

Already implemented:

- GitHub repo add flow from `/ops/projects/new`.
- Figma-style project detail canvas at `/ops/projects/:projectId`.
- Canvas API hydration through `GET /api/ops/projects/:id/canvas`.
- Canvas save through `PATCH /api/ops/projects/:id/canvas`.
- Markdown export and browser PNG export.
- NestJS `apps/ops-api` with canvas, export, live GitHub tree/content routes.
- Next API proxy to NestJS via `OPS_API_BASE_URL`.
- Live GitHub analysis for `portfolio`, `pawpong`, and `tori-house` project canvas.
- Supabase-first code path for projects/tasks/canvas when service-role env exists, local JSON fallback otherwise.

Known gaps:

- Current IA is mostly route/file-analysis graph, not Manyfast-style page hierarchy.
- PRD, Requirement, Feature, Specification, User Flow, and Wireframe are not first-class persisted entities.
- Architecture exists as canvas nodes but is not normalized into a durable architecture model.
- AI suggestion/approval workflow exists only as conceptual node source, not as a real data flow.
- Supabase schema for planning entities is not yet defined/applied.
- Deployment needs env/config decisions for running NestJS + Next + Supabase together.

## Target UX

Keep the existing Figma-style canvas as the main interaction surface. Add structured planning layers around it.

### Canvas Modes

- `IA Tree`: Manyfast-style page hierarchy with depth, parent/child pages, linked specs.
- `IA Detail`: page descriptions, linked features/specifications, user roles, evidence.
- `Architecture Graph`: API, service, component, database, job, integration, auth, deploy nodes.
- `User Flow`: user journey steps connected to IA pages and feature specs.
- `Spec Directory`: Requirement -> Feature -> Specification tree.
- `Wireframe Blocks`: page-level sections/block layout derived from IA and specs.
- `GitHub Evidence`: code refs, imports, API calls, markdown docs, confidence.
- `Agent Tasks`: implementation tasks generated from specs/canvas diffs.

### Page Layout

The route remains:

```text
/ops/projects/:projectId
```

Recommended layout:

- Left rail: mode switcher, document tree, filters.
- Main area: existing Figma-style infinite canvas.
- Right inspector: selected item details, evidence, linked specs, AI suggestions.
- Bottom/status bar: data source, backend source, save state, export state.

## Target Data Model

The key shift is from only `canvas.nodes/edges` to a normalized planning graph.

### Core Entities

```ts
ProjectPlanningDocument {
  id: string;
  projectId: string;
  source: "idea" | "github" | "manual" | "ai";
  prd: PRDDocument;
  requirements: Requirement[];
  features: Feature[];
  specifications: Specification[];
  iaPages: IAPage[];
  userFlows: UserFlow[];
  wireframes: WireframeBlock[];
  architecture: ArchitectureNode[];
  canvas: CanvasModel;
  agentTasks: AgentTask[];
  evidence: GitHubEvidence[];
  updatedAt: string;
}
```

### PRD

```ts
PRDDocument {
  overview: string;
  goals: string[];
  targetUsers: UserRole[];
  coreValues: string[];
  scenarios: string[];
  successMetrics: string[];
  risks: string[];
  openQuestions: string[];
}
```

### Functional Spec

Manyfast-style hierarchy:

```ts
Requirement {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "doing" | "done" | "blocked";
}

Feature {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  userRoleIds: string[];
  status: "todo" | "doing" | "done" | "blocked";
}

Specification {
  id: string;
  featureId: string;
  title: string;
  behavior: string;
  acceptanceCriteria: string[];
  edgeCases: string[];
  linkedPageIds: string[];
  linkedApiIds: string[];
  evidenceIds: string[];
}
```

### IA

Manyfast-style IA, extended with GitHub evidence:

```ts
IAPage {
  id: string;
  projectId: string;
  title: string;
  route?: string;
  depth: number;
  parentId?: string;
  description: string;
  linkedSpecificationIds: string[];
  linkedUserFlowStepIds: string[];
  linkedWireframeBlockIds: string[];
  evidenceIds: string[];
  source: "github-analysis" | "manual" | "ai-suggestion";
  confidence?: number;
}
```

### User Flow

```ts
UserFlow {
  id: string;
  title: string;
  actorRoleId?: string;
  steps: UserFlowStep[];
}

UserFlowStep {
  id: string;
  pageId?: string;
  action: string;
  systemResponse: string;
  nextStepIds: string[];
  linkedSpecificationIds: string[];
}
```

### Wireframe

```ts
WireframeBlock {
  id: string;
  pageId: string;
  sectionName: string;
  layoutType: "hero" | "list" | "form" | "table" | "kanban" | "canvas" | "modal" | "sidebar" | "chart" | "custom";
  contentPurpose: string;
  linkedSpecificationIds: string[];
  evidenceIds: string[];
  order: number;
}
```

### Architecture

```ts
ArchitectureNode {
  id: string;
  kind: "frontend" | "api" | "service" | "database" | "storage" | "job" | "integration" | "auth" | "deploy" | "agent";
  label: string;
  description: string;
  codeRefs: string[];
  apiLinks: string[];
  evidenceIds: string[];
  confidence?: number;
}
```

### GitHub Evidence

```ts
GitHubEvidence {
  id: string;
  repo: string;
  branch: string;
  path: string;
  evidenceType: "route" | "component" | "api" | "service" | "schema" | "job" | "docs" | "config" | "auth";
  summary: string;
  imports: string[];
  apiCalls: string[];
  headings: string[];
  confidence: number;
}
```

### AI Suggestion

```ts
AISuggestion {
  id: string;
  projectId: string;
  targetType: "prd" | "requirement" | "feature" | "specification" | "ia-page" | "user-flow" | "wireframe" | "architecture" | "canvas" | "agent-task";
  action: "create" | "update" | "delete" | "link";
  proposedValue: unknown;
  rationale: string;
  evidenceIds: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
```

## API Design

Keep the browser calling Next `/api/ops/...`; Next remains auth/BFF. NestJS is the backend when `OPS_API_BASE_URL` is configured.

### Planning Document

```http
GET /api/ops/projects/:id/planning
POST /api/ops/projects/:id/planning/generate
PATCH /api/ops/projects/:id/planning
```

### IA

```http
GET /api/ops/projects/:id/ia
PATCH /api/ops/projects/:id/ia
POST /api/ops/projects/:id/ia/generate-from-github
```

### Specs

```http
GET /api/ops/projects/:id/specifications
PATCH /api/ops/projects/:id/specifications
POST /api/ops/projects/:id/specifications/generate-from-prd
POST /api/ops/projects/:id/specifications/generate-from-github
```

### User Flow

```http
GET /api/ops/projects/:id/user-flows
PATCH /api/ops/projects/:id/user-flows
POST /api/ops/projects/:id/user-flows/generate-from-ia
```

### Wireframe

```http
GET /api/ops/projects/:id/wireframes
PATCH /api/ops/projects/:id/wireframes
POST /api/ops/projects/:id/wireframes/generate-from-ia
```

### Architecture

```http
GET /api/ops/projects/:id/architecture
PATCH /api/ops/projects/:id/architecture
POST /api/ops/projects/:id/architecture/generate-from-github
```

### Canvas

Existing endpoints stay:

```http
GET /api/ops/projects/:id/canvas
PATCH /api/ops/projects/:id/canvas
POST /api/ops/projects/:id/canvas/export
```

The canvas response should evolve from only nodes/edges to:

```ts
{
  ok: true,
  project,
  repo,
  planning,
  ia,
  specifications,
  userFlows,
  wireframes,
  architecture,
  evidence,
  canvas: { nodes, edges, summary },
  source: "supabase" | "github-analysis" | "saved-canvas" | "fallback",
  backend: "nest"
}
```

### AI Suggestions

```http
GET /api/ops/projects/:id/suggestions
POST /api/ops/projects/:id/suggestions
POST /api/ops/projects/:id/suggestions/:suggestionId/approve
POST /api/ops/projects/:id/suggestions/:suggestionId/reject
```

### Export

```http
POST /api/ops/projects/:id/export/prd
POST /api/ops/projects/:id/export/specifications
POST /api/ops/projects/:id/export/ia
POST /api/ops/projects/:id/export/user-flow
POST /api/ops/projects/:id/export/architecture
POST /api/ops/projects/:id/export/agent-brief
```

Output formats:

- `PRD.md`
- `Functional-Spec.md`
- `Functional-Spec.xlsx` later
- `IA.md`
- `IA.png`
- `User-Flow.mermaid`
- `Architecture.md`
- `Architecture.png`
- `Agent-Implementation-Brief.md`

## Supabase Schema Plan

Add tables:

```sql
ops_project_planning_documents
ops_project_prds
ops_project_requirements
ops_project_features
ops_project_specifications
ops_project_ia_pages
ops_project_user_flows
ops_project_user_flow_steps
ops_project_wireframe_blocks
ops_project_architecture_nodes
ops_project_github_evidence
ops_project_ai_suggestions
ops_project_exports
```

Rules:

- All tables include `project_id`, `created_at`, `updated_at`.
- Canvas table can remain `ops_project_canvases`, but it should reference normalized planning objects.
- Use service-role server access only for now.
- Enable RLS on public tables before deploy.
- Do not expose service-role keys to the browser.

## Deployment Architecture

Target deploy setup:

```text
Browser
  -> Next.js /ops UI
  -> Next.js /api/ops/* auth/BFF
  -> NestJS ops-api
  -> Supabase
  -> GitHub API
```

Environment variables:

```bash
OPS_API_BASE_URL=https://<ops-api-host>
OPS_API_KEY=<server-to-server-key>
PORTFOLIO_SUPABASE_URL=<supabase-url>
PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
PORTFOLIO_OPS_DATA_MODE=supabase
```

Local dev:

```bash
npm run ops-api:build
OPS_API_PORT=4010 npm run ops-api:start
OPS_API_BASE_URL=http://localhost:4010 npm run dev
```

## Execution Plan

This plan should be completed through 9 future `/goal` runs. Each goal should finish with tests and a progress report.

### Goal 1: Normalize Planning Contract

Objective:
Define framework-free planning DTO builders and tests.

Status: completed on 2026-05-16.

Files:

- `lib/ops/project-planning-contract.mjs`
- `tests/ops-project-planning-contract.test.mjs`
- `components/ops/project-management/mock-data.ts`

Tasks:

1. Add PRD, Requirement, Feature, Specification, IAPage, UserFlow, WireframeBlock, ArchitectureNode, GitHubEvidence types.
2. Add `buildPlanningDocumentFromRepoAnalysis()`.
3. Add `buildManyfastStyleIaFromRoutes()`.
4. Add `buildArchitectureModelFromRepoAnalysis()`.
5. Add tests for GitHub-first Portfolio/Pawpong/Tori transformation.

Verification:

```bash
node --test tests/ops-project-planning-contract.test.mjs
npm run typecheck
```

Completed implementation:

- Added `lib/ops/project-planning-contract.mjs`.
- Added `tests/ops-project-planning-contract.test.mjs`.
- Added typed re-exports in `components/ops/project-management/mock-data.ts`.
- Implemented `buildPlanningDocumentFromRepoAnalysis()`.
- Implemented `buildManyfastStyleIaFromRoutes()`.
- Implemented `buildArchitectureModelFromRepoAnalysis()`.
- Verified Portfolio route hierarchy, Pawpong fallback IA/auth evidence, and Tori service/job-heavy architecture.

### Goal 2: Supabase Schema for Planning Entities

Objective:
Create durable DB tables for planning docs, IA, specs, architecture, evidence, and suggestions.

Status: completed on 2026-05-16.

Files:

- `supabase/ops-schema.sql`
- optional migration file if Supabase CLI is used

Tasks:

1. Add planning tables.
2. Add indexes on `project_id`, parent ids, status, source.
3. Enable RLS.
4. Add service-role safe access assumptions.
5. Add seed/upsert strategy from existing project JSON.

Verification:

```bash
npm run ops-api:build
```

If Supabase env exists:

```bash
npm run ops:doctor
```

Completed implementation:

- Added normalized planning tables to `supabase/ops-schema.sql`.
- Added PRD, Requirement, Feature, Specification, IA Page, User Flow, User Flow Step, Wireframe Block, Architecture Node, GitHub Evidence, AI Suggestion, Export tables.
- Added `project_id` indexes, relationship indexes, status/type indexes, and updated-at indexes where relevant.
- Enabled RLS on every new planning table.
- Kept the current service-role-only access posture; no anon/browser policies were added.
- Added `tests/ops-planning-schema.test.mjs` to prevent schema drift and verify table/RLS/project-reference constraints.

### Goal 3: NestJS Planning API

Objective:
Implement NestJS CRUD/generate endpoints for planning, IA, specs, architecture, evidence.

Status: completed on 2026-05-16.

Files:

- `apps/ops-api/src/project-planning.controller.ts`
- `apps/ops-api/src/services/planning-store.service.ts`
- `apps/ops-api/src/services/planning-generator.service.ts`
- `apps/ops-api/src/app.module.ts`

Tasks:

1. Implement `GET /ops/projects/:id/planning`.
2. Implement `POST /ops/projects/:id/planning/generate`.
3. Implement `PATCH /ops/projects/:id/planning`.
4. Generate from live GitHub tree/content.
5. Persist to Supabase when configured, local fallback otherwise.

Verification:

```bash
npm run ops-api:build
```

Runtime smoke:

```bash
OPS_API_PORT=4010 npm run ops-api:start
curl http://localhost:4010/ops/projects/portfolio/planning
```

Completed implementation:

- Added NestJS planning endpoints for full planning document generate/read/save.
- Added split read endpoints for IA, specifications, architecture, and GitHub evidence.
- Added GitHub/local repo analysis based planning generation through `buildPlanningDocumentFromRepoAnalysis()`.
- Added Supabase-first persistence for normalized planning tables with local JSON fallback.
- Verified local runtime on `OPS_API_PORT=4012` with `portfolio`: 4 requirements, 3 features, 15 specifications, 8 IA pages, 1 user flow, 8 wireframes, 7 architecture nodes, and 182 evidence records.
- Verified `PATCH /ops/projects/:id/planning` persists and subsequent `GET` returns `source: saved-planning`.

### Goal 4: Next API Proxy for Planning Endpoints

Objective:
Expose planning endpoints through Next auth/BFF and prove browser-compatible API calls.

Status: completed on 2026-05-17.

Files:

- `app/api/ops/projects/[id]/planning/route.ts`
- `app/api/ops/projects/[id]/ia/route.ts`
- `app/api/ops/projects/[id]/specifications/route.ts`
- `app/api/ops/projects/[id]/architecture/route.ts`
- `app/api/ops/projects/[id]/user-flows/route.ts`
- `app/api/ops/projects/[id]/wireframes/route.ts`

Tasks:

1. Add authenticated proxy routes.
2. Keep local fallback only where needed.
3. Return `x-ops-backend-source: nest`.
4. Verify from a Next dev server.

Verification:

```bash
npm run typecheck
npm run lint
```

Completed implementation:

- Added authenticated Next BFF routes for planning, planning generate, IA, specifications, architecture, user flows, wireframes, and evidence.
- Added `lib/ops/planning-proxy-route.ts` so slice routes consistently proxy to NestJS and return `x-ops-backend-source: nest`.
- Added NestJS split read endpoints for `user-flows` and `wireframes`.
- Verified from Next dev server with `OPS_API_BASE_URL=http://localhost:4013`: `GET /api/ops/projects/portfolio/planning` returned `source: saved-planning` and `x-ops-backend-source: nest`.
- Verified `GET /api/ops/projects/portfolio/ia` returned 8 IA pages through the Next -> Nest path.

### Goal 4.5: Live GitHub Repository Picker and Readable Canvas Layout

Objective:
Fix the project add screen so it calls a real GitHub-backed API and make canvas node placement readable.

Status: completed on 2026-05-17.

Completed implementation:

- Added `GET /api/ops/projects` to fetch live GitHub repositories via authenticated `gh` CLI and fall back to cache if live GitHub fails.
- Updated `/ops/projects/new` client UI to call `GET /api/ops/projects` on mount and show the repository source.
- Updated `POST /api/ops/projects` so adding a repo can resolve from live GitHub, not only stale cache.
- Added readable lane layout: IA nodes stay in the top lane, architecture nodes in the middle lane, and export/AI nodes in the bottom lane.
- Added `Auto layout` action and saved the current `portfolio` canvas back to Supabase using the new lane layout.
- Runtime proof: live GitHub repo picker returned 39 repositories with source `live-github`; current `portfolio` saved canvas has 26 nodes with entry/repo/route/API nodes placed into separate lanes.

### Goal 5: Canvas UI Modes

Objective:
Keep current Figma-style canvas but add Manyfast-style modes.

Status: completed on 2026-05-17.

Files:

- `components/ops/project-management/ProjectCanvasPage.tsx`
- new subcomponents under `components/ops/project-management/canvas-modes/`

Tasks:

1. Add mode switcher: IA Tree, IA Detail, Architecture, User Flow, Spec Directory, Wireframe, Evidence, Agent Tasks.
2. Render IA pages as depth-based structured nodes.
3. Render architecture as graph nodes.
4. Add inspector fields for linked specs/evidence.
5. Display current backend/data source.

Verification:

```bash
npm run typecheck
npm run lint
```

Browser QA:

- Open `/ops/projects/portfolio`.
- Confirm canvas still feels Figma-style.
- Confirm IA mode is hierarchical, not just file graph.

Completed implementation:

- Expanded canvas modules to IA Tree, Spec Directory, User Flow, Wireframe Blocks, System Architecture, GitHub Evidence, Agent Tasks, Export, and Deploy.
- Added mode-specific node visibility so each mode stops rendering the whole graph at once.
- Added a mode detail panel backed by `GET /api/ops/projects/:id/planning`, showing IA hierarchy, spec counts, user-flow steps, wireframe blocks, architecture nodes, evidence, and agent tasks.
- Kept the Figma-style canvas interaction model: pan/zoom, node drag, inspector, edit, save, export, and auto-layout remain available.
- Verified from Next dev server with Nest proxy: planning, user-flows, and wireframes all returned through `x-ops-backend-source: nest`.

### Goal 6: Generate and Save Planning Data from GitHub

Objective:
Make GitHub-first projects produce persisted PRD/spec/IA/architecture drafts.

Status: completed on 2026-05-17.

Tasks:

1. Add “Generate planning from GitHub” action.
2. Call Nest planning generate endpoint.
3. Save generated planning entities to Supabase/local fallback.
4. Refresh canvas from persisted planning data.
5. Confirm `pawpong` and `tori-house` no longer show static-template canvas.

Verification:

Runtime smoke should prove:

- `source: supabase` or `source: saved-planning`.
- `iaPages.length > 0`.
- `specifications.length > 0`.
- `architecture.length > 0`.
- `evidence.length > 0`.

Completed implementation:

- Added `Generate planning from GitHub` action to the canvas actions bar.
- Added `buildPlanningCanvasModel()` so generated planning data creates a real canvas model instead of an empty `canvas.nodes`.
- Updated Nest `POST /ops/projects/:id/planning/generate` to save both normalized planning entities and the generated planning canvas.
- Frontend now refreshes planning state and replaces visible canvas nodes immediately after generation.
- Runtime proof through Next -> Nest: `POST /api/ops/projects/portfolio/planning/generate` returned `x-ops-backend-source: nest`, 8 IA pages, 7 architecture nodes, and a 32-node planning canvas. Subsequent `GET /api/ops/projects/portfolio/canvas` returned `source: saved-canvas` with `planning-root`.

### Goal 7: AI Suggestion and Approval Workflow

Objective:
Add Manyfast-style AI edit proposals with approval/rejection.

Tasks:

1. Add suggestion table/API.
2. Generate suggestions for PRD/spec/IA/architecture.
3. Show pending suggestions in inspector.
4. Apply approved suggestions to normalized planning entities.
5. Reject suggestions without mutating source data.

Verification:

- Create suggestion.
- Approve suggestion.
- Confirm DB/local state changes.
- Reject suggestion.
- Confirm state does not change.

Status: completed on 2026-05-17.

Implementation notes:

- Added Nest suggestion API backed by Supabase `ops_project_ai_suggestions` with local JSON fallback.
- Added deterministic planning-gap suggestion generation for missing wireframes, missing IA links, and AI/agent architecture.
- Added approve/reject endpoints. Approve mutates normalized planning data and regenerates/saves the planning canvas; reject only changes suggestion status.
- Added Next BFF proxy routes for suggestion list/create/generate/approve/reject.
- Added canvas inspector UI for pending suggestions with approve/reject controls and an `AI 제안 생성` action.
- Runtime proof through Next -> Nest: created an architecture suggestion, approved it, then `GET /api/ops/projects/portfolio/canvas` returned `x-ops-backend-source: nest`, 34 canvas nodes, and a visible `AI Approval Workflow` canvas node.

### Goal 8: Export Center

Objective:
Upgrade export from canvas dump to real planning deliverables.

Tasks:

1. `PRD.md` export.
2. `Functional-Spec.md` export.
3. `IA.md` export.
4. `User-Flow.mermaid` export.
5. `Architecture.md` export.
6. `Agent-Implementation-Brief.md` export.
7. Keep current PNG export.

Verification:

- Export each format.
- Confirm exported docs include project, repo, linked specs, evidence, and architecture.

Status: completed on 2026-05-17.

Implementation notes:

- Added shared planning export builder in `project-planning-contract.mjs` for PRD, Functional Spec, IA, User Flow mermaid, Architecture, Agent Brief, and Planning Canvas markdown.
- Added Nest `POST /ops/projects/:id/export/:exportType` endpoint that reads saved planning, creates the selected deliverable, and records export metadata in Supabase `ops_project_exports` with local JSON fallback.
- Added Next BFF route `POST /api/ops/projects/:id/export/:exportType` so the browser still talks to the frontend origin while Next proxies to Nest.
- Added canvas action buttons for `PRD`, `Spec`, `IA`, `Flow`, `Arch`, `Agent Brief`, and `Canvas MD` export. Existing PNG export remains browser-side.
- Runtime proof through Next -> Nest on 2026-05-17: all 7 export endpoints returned `ok: true`, `x-ops-backend-source: nest`, expected filenames, and content containing project, repo, evidence, and architecture references.

### Goal 9: Deployment Readiness and DB Integration Verification

Objective:
Make the feature safe for deployment and prove DB-backed rendering.

Tasks:

1. Apply Supabase schema.
2. Configure deployment env for Next and Nest.
3. Confirm `PORTFOLIO_OPS_DATA_MODE=supabase`.
4. Confirm frontend renders data from Nest/Supabase.
5. Add data-source indicator in UI.
6. Run production build.
7. Document runbook.

Verification:

```bash
npm run ops-api:build
npm run typecheck
npm run lint
npm run build
```

Runtime proof:

- Next response header: `x-ops-backend-source: nest`.
- Nest health: `projects: supabase`, `tasks: supabase`, `canvasStore: supabase`.
- Canvas response: `source: supabase` or `saved-planning`.
- Browser UI shows data source as Supabase/Nest.

## Completion Criteria

The roadmap is complete when:

- Project detail page keeps the current Figma-style canvas.
- IA is Manyfast-style page hierarchy with linked specifications.
- Architecture is separate and evidence-backed.
- PRD/spec/user-flow/wireframe/architecture are persisted.
- GitHub repo analysis can generate planning docs for existing projects.
- New project idea flow can generate planning docs without GitHub.
- Frontend receives data through Next -> Nest -> Supabase/GitHub.
- Export center produces useful meeting/dev artifacts.
- AI suggestions require approve/reject before changing data.
- Deployment env can run the same flow outside localhost.

## Expected Goal Count

Estimated `/goal` runs to complete:

```text
9 goals
```

If one goal gets too large, split it. The highest-risk goals are:

- Goal 2: Supabase schema and DB application.
- Goal 5: Canvas UI mode refactor.
- Goal 7: AI suggestion approval model.
- Goal 9: deployment/runtime verification.

## Progress Estimate After This Plan

Current implementation baseline: approximately `70%` of the infrastructure prototype.

Completion against the new Manyfast + GitHub planning product goal after Goal 3: approximately `45%`.

Reason:

- Backend/GitHub/canvas foundation exists.
- The actual planning document model, Manyfast-style IA, normalized specs, wireframes, AI suggestions, and DB-backed deploy verification are still ahead.
