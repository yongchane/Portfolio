import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRepoStructure,
  buildCanvasModel,
  buildCanvasNodes,
  buildProjectCanvasResponse,
  createProjectFromRepo,
  findProjectByProjectId,
  findRepoByProjectId,
  getAvailableGitHubRepos,
  getManagedRepos,
  sanitizeCanvasPayload,
  toProjectId,
} from "../lib/ops/project-management-contract.mjs";

const portfolioRepo = {
  repo: "yongchane/Portfolio",
  owner: "yongchane",
  name: "Portfolio",
  url: "https://github.com/yongchane/Portfolio",
  description: "Portfolio operations console",
  visibility: "public",
  defaultBranch: "develop",
  pushedAt: "2026-05-14T14:31:43Z",
  primaryLanguage: "TypeScript",
};

test("toProjectId creates stable route ids from GitHub repo names", () => {
  assert.equal(toProjectId(portfolioRepo), "yongchane-portfolio");
});

test("createProjectFromRepo creates a managed project seed from GitHub metadata", () => {
  const project = createProjectFromRepo(portfolioRepo, {
    now: "2026-05-15T00:00:00.000Z",
  });

  assert.equal(project.id, "yongchane-portfolio");
  assert.equal(project.name, "Portfolio");
  assert.equal(project.repo, "yongchane/Portfolio");
  assert.equal(project.branch, "develop");
  assert.equal(project.stage, "planning");
  assert.match(project.summary, /Portfolio operations console/);
  assert.ok(project.checklist.some((item) => item.id === "repo-analysis"));
  assert.ok(project.githubFocus?.some((item) => item.includes("develop")));
});

test("getManagedRepos returns persisted managed repos only", () => {
  const managed = getManagedRepos({
    projects: [createProjectFromRepo(portfolioRepo)],
    github: {
      repoSnapshots: [
        portfolioRepo,
        {
          ...portfolioRepo,
          repo: "yongchane/Other",
          name: "Other",
        },
      ],
    },
  });

  assert.equal(managed.length, 1);
  assert.equal(managed[0].repo.repo, "yongchane/Portfolio");
  assert.equal(managed[0].project.id, "yongchane-portfolio");
});

test("available repos keep the persisted project id for canonical canvas links", () => {
  const persistedProject = {
    ...createProjectFromRepo(portfolioRepo),
    id: "portfolio",
  };
  const repos = getAvailableGitHubRepos({
    projects: [persistedProject],
    github: {
      repoSnapshots: [portfolioRepo],
    },
  });

  assert.equal(repos[0].managed, true);
  assert.equal(repos[0].project.id, "portfolio");
});

test("project id lookup resolves existing project ids before generated repo slugs", () => {
  const persistedProject = {
    ...createProjectFromRepo(portfolioRepo),
    id: "portfolio",
  };
  const data = {
    projects: [persistedProject],
    github: {
      repoSnapshots: [
        {
          ...portfolioRepo,
          repo: "yongchane/tori-admin",
          name: "tori-admin",
        },
        portfolioRepo,
      ],
    },
  };

  assert.equal(findProjectByProjectId(data, "portfolio").repo, "yongchane/Portfolio");
  assert.equal(findRepoByProjectId(data, "portfolio").repo, "yongchane/Portfolio");
  assert.equal(findRepoByProjectId(data, "yongchane-portfolio").repo, "yongchane/Portfolio");
});

test("buildCanvasNodes derives IA and architecture nodes from repo metadata", () => {
  const nodes = buildCanvasNodes(
    portfolioRepo,
    "https://hyunyongchan.kr",
    createProjectFromRepo(portfolioRepo),
  );

  assert.ok(nodes.some((node) => node.id === "repo"));
  assert.ok(nodes.some((node) => node.type === "page" && node.label.includes("/ops")));
  assert.ok(nodes.some((node) => node.type === "api" && node.apiLinks.some((link) => link.includes("/api/ops"))));
  assert.ok(nodes.some((node) => node.type === "database" && node.meta.includes("local fallback")));
  assert.ok(nodes.some((node) => node.type === "deploy" && node.description.includes("hyunyongchan")));
});

test("analyzeRepoStructure turns repo files into practical IA and architecture graph nodes", () => {
  const analysis = analyzeRepoStructure({
    files: [
      "README.md",
      "docs/plans/project-canvas.md",
      "app/page.tsx",
      "app/ops/projects/page.tsx",
      "app/ops/projects/new/page.tsx",
      "app/ops/projects/[projectId]/page.tsx",
      "app/api/ops/projects/route.ts",
      "components/ops/project-management/ProjectCanvasPage.tsx",
      "lib/ops/data.ts",
      "lib/ops/mutations.ts",
      "lib/ops/auth.ts",
      "data/ops/projects.json",
      "supabase/ops-schema.sql",
      "scripts/sync-ops-github.mjs",
      "package.json",
    ],
    fileContents: {
      "README.md": "# Portfolio\n\n## Ops Console\n",
      "docs/plans/project-canvas.md": "# Project Canvas\n\n## IA\n\n## Architecture\n",
      "app/ops/projects/page.tsx": "import { ProjectRepositoryListPage } from '@/components/ops/project-management/ProjectRepositoryListPage';\nexport default function Page() { return <ProjectRepositoryListPage />; }",
      "app/ops/projects/new/page.tsx": "import { GitHubRepositoryBrowserPage } from '@/components/ops/project-management/GitHubRepositoryBrowserPage';",
      "app/ops/projects/[projectId]/page.tsx": "import { ProjectCanvasPage } from '@/components/ops/project-management/ProjectCanvasPage';",
      "app/api/ops/projects/route.ts": "import { addProjectFromGitHubRepo } from '@/lib/ops/mutations';",
      "components/ops/project-management/ProjectCanvasPage.tsx": "import { buildCanvasModel } from '@/components/ops/project-management/mock-data';\nfetch('/api/ops/projects')",
      "lib/ops/mutations.ts": "import { getSupabaseAdminClient } from '@/lib/ops/supabase';",
      "lib/ops/auth.ts": "export function isOpsAuthenticated() { return true; }",
    },
  });

  assert.equal(analysis.summary.routes, 4);
  assert.equal(analysis.summary.apiRoutes, 1);
  assert.ok(analysis.summary.imports >= 5);
  assert.ok(analysis.summary.docHeadings >= 3);
  assert.ok(analysis.nodes.some((node) => node.type === "route" && node.label === "/ops/projects"));
  assert.ok(analysis.nodes.some((node) => node.label === "/ops/projects" && node.interactions.some((item) => item.includes("ProjectRepositoryListPage"))));
  assert.ok(analysis.nodes.some((node) => node.type === "component" && node.codeRefs.includes("components/ops/project-management/ProjectCanvasPage.tsx")));
  assert.ok(analysis.nodes.some((node) => node.type === "security" && node.codeRefs.includes("lib/ops/auth.ts")));
  assert.ok(analysis.nodes.some((node) => node.type === "artifact" && node.interactions.some((item) => item.includes("Architecture"))));
  assert.ok(analysis.edges.some((edge) => edge.relation === "imports"));
  assert.ok(analysis.edges.some((edge) => edge.relation === "reads/writes"));
});

test("buildCanvasModel uses analyzer output instead of only static template edges", () => {
  const analysis = analyzeRepoStructure({
    files: [
      "app/ops/projects/page.tsx",
      "app/api/ops/projects/route.ts",
      "components/ops/project-management/ProjectCanvasPage.tsx",
      "lib/ops/mutations.ts",
      "data/ops/projects.json",
      "docs/plans/project-canvas.md",
    ],
  });
  const model = buildCanvasModel(portfolioRepo, undefined, createProjectFromRepo(portfolioRepo), analysis);

  assert.ok(model.nodes.some((node) => node.type === "route" && node.label === "/ops/projects"));
  assert.ok(model.nodes.some((node) => node.type === "service" && node.label === "Domain Services"));
  assert.ok(model.edges.some((edge) => edge.relation === "calls"));
  assert.ok(model.summary.files >= 6);
});

test("buildProjectCanvasResponse returns API-ready canvas payload", () => {
  const project = {
    ...createProjectFromRepo(portfolioRepo),
    id: "portfolio",
  };
  const analysis = analyzeRepoStructure({
    files: [
      "app/ops/projects/page.tsx",
      "app/api/ops/projects/route.ts",
      "components/ops/project-management/ProjectCanvasPage.tsx",
      "lib/ops/mutations.ts",
      "data/ops/projects.json",
    ],
  });

  const response = buildProjectCanvasResponse({
    projects: [project],
    github: {
      repoSnapshots: [portfolioRepo],
    },
  }, "portfolio", analysis);

  assert.equal(response.project.id, "portfolio");
  assert.equal(response.repo.repo, "yongchane/Portfolio");
  assert.equal(response.source, "repo-analysis");
  assert.ok(response.canvas.nodes.some((node) => node.type === "route"));
  assert.ok(response.canvas.edges.some((edge) => edge.relation === "calls"));
});

test("sanitizeCanvasPayload keeps saveable nodes and drops unsafe edges", () => {
  const canvas = sanitizeCanvasPayload({
    nodes: [
      {
        id: "route-projects",
        type: "route",
        shape: "rect",
        icon: "R",
        label: "Projects",
        description: "Project list",
        x: 100,
        y: 120,
        source: "github-analysis",
        meta: ["IA"],
        codeRefs: ["app/ops/projects/page.tsx"],
        interactions: ["navigate"],
        apiLinks: ["/api/ops/projects"],
        confidence: 1.4,
      },
      {
        id: "custom-note",
        type: "unknown",
        shape: "unknown",
        icon: "",
        label: "",
        description: 123,
        x: -10,
        y: 99999,
        source: "unknown",
      },
    ],
    edges: [
      { id: "valid", source: "route-projects", target: "custom-note", relation: "uses", label: "uses" },
      { id: "invalid", source: "missing", target: "custom-note", relation: "uses", label: "uses" },
    ],
  });

  assert.equal(canvas.nodes.length, 2);
  assert.equal(canvas.nodes[0].confidence, 1);
  assert.equal(canvas.nodes[1].type, "feature");
  assert.equal(canvas.nodes[1].shape, "rect");
  assert.equal(canvas.nodes[1].source, "user-created");
  assert.equal(canvas.edges.length, 1);
  assert.equal(canvas.edges[0].id, "valid");
});
