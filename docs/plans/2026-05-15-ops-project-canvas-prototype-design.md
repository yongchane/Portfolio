# /ops Project Canvas Prototype Design

Date: 2026-05-15
Branch: `develop`

## Goal

Turn `/ops/projects` from a mock navigation flow into the first real project-management slice:

```text
GitHub cache repo
-> Add to Ops
-> persisted managed project
-> repo-aware IA / architecture canvas
```

The long-term goal is a project development board where a GitHub project can be added, visualized as IA/architecture nodes, edited like a sketch board, exported for team discussion, saved to Obsidian, and later handed to AI agents for review or implementation.

## Phase Boundary

This phase does **not** call the live GitHub API directly. It uses the existing `data/ops/github-cache.json` snapshot as the repo source.

Live GitHub OAuth/API work belongs in the later NestJS backend phase:

```text
apps/web          -> Next.js frontend
apps/ops-api      -> NestJS backend for GitHub/API/analysis/agent jobs
packages/ops-contract -> shared DTO/schema later, if needed
```

## Prototype Architecture

For the first slice, keep the implementation inside the current Next.js app and make the data contract explicit.

```text
GitHubRepositoryBrowserPage
  -> POST /api/ops/projects
  -> create project from GitHub cache repo
  -> Supabase-first write when configured
  -> local data/ops/projects.json fallback
  -> /ops/projects/[projectId] canvas
  -> canvas model derived from repo/project metadata
```

## Data Contract

The prototype needs deterministic, backend-portable functions:

- `toProjectId(repo)` creates a stable route/project id from `owner/name`.
- `createProjectFromRepo(repo)` converts GitHub metadata into an initial managed project.
- `getManagedRepos(data)` shows only persisted managed repos, not arbitrary fallback repos.
- `buildCanvasNodes(repo, deployUrl, project)` derives IA, API, DB, deploy, docs, export, and agent nodes.

These functions should avoid React and framework dependencies so they can move to NestJS later.

## User Behavior

1. User opens `/ops/projects/new`.
2. User clicks `Add to Ops` on a GitHub repo.
3. The UI calls `POST /api/ops/projects`.
4. The repo becomes a managed project.
5. The user is routed to `/ops/projects/<projectId>`.
6. Canvas uses repo/project metadata to show concrete IA and architecture starter nodes.

## Persistence

Use the existing ops persistence discipline:

- Supabase first when configured and reachable.
- Local `data/ops/projects.json` fallback when Supabase is unavailable.
- Do not require Supabase env for local prototype work.

## NestJS Later

Move these responsibilities to `apps/ops-api` only after the prototype proves the contract:

- live GitHub repo listing and tree reads,
- file-based IA extraction,
- architecture graph analysis,
- persistent canvas node/edge storage,
- AI review/agent job orchestration,
- markdown/PNG export generation.

