# Ops Routing Project Management Mock Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `/ops` into real routes and reshape Project Management into list → add GitHub repo → canvas detail mock flow.

**Architecture:** Add a shared `/ops` shell with route-based navigation. Keep this phase as frontend mock only: repository/project/canvas data is derived from existing loaded data or static mock nodes, with clear labels that API/DB integration is not yet complete.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, existing `/ops` auth and data loader.

---

### Task 1: Create shared route shell

**Files:**
- Create: `components/ops/OpsRouteShell.tsx`

**Steps:**
1. Implement a client shell that shows `AccessGate` when unauthenticated.
2. Render simplified sidebar links: `/ops`, `/ops/projects`, `/ops/macmini`, `/ops/openclaw`, `/ops/docs`.
3. Use `usePathname()` to highlight active link.
4. Keep small metrics/source cards in the sidebar.

### Task 2: Add project management mock pages

**Files:**
- Create: `components/ops/project-management/mock-data.ts`
- Create: `components/ops/project-management/ProjectRepositoryListPage.tsx`
- Create: `components/ops/project-management/GitHubRepositoryBrowserPage.tsx`
- Create: `components/ops/project-management/ProjectCanvasPage.tsx`

**Steps:**
1. Create mock project cards derived from GitHub repo snapshots.
2. `/projects` page shows only added/managed repository list and an add button.
3. `/projects/new` page shows scrollable GitHub repository browser with `Add to Ops` mock buttons.
4. `/projects/[projectId]` page shows n8n-style canvas and node inspector only.

### Task 3: Add App Router pages

**Files:**
- Modify: `app/ops/page.tsx`
- Create: `app/ops/projects/page.tsx`
- Create: `app/ops/projects/new/page.tsx`
- Create: `app/ops/projects/[projectId]/page.tsx`
- Create: `app/ops/macmini/page.tsx`
- Create: `app/ops/openclaw/page.tsx`
- Create: `app/ops/docs/page.tsx`

**Steps:**
1. Each page checks auth and loads `getOpsConsoleData()` only when authenticated.
2. Wrap content in `OpsRouteShell`.
3. Use simple mock/setter callbacks for legacy section components where needed.

### Task 4: Verify

**Commands:**
- `npm run typecheck`
- `npx eslint app/ops components/ops/OpsRouteShell.tsx components/ops/project-management`
- `npm run build`

**Expected:** All pass.
