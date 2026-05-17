import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRepoStructure,
  createProjectFromRepo,
} from "../lib/ops/project-management-contract.mjs";
import {
  buildArchitectureModelFromRepoAnalysis,
  buildManyfastStyleIaFromRoutes,
  buildPlanningDeliverable,
  buildPlanningDocumentFromRepoAnalysis,
} from "../lib/ops/project-planning-contract.mjs";

const repo = {
  repo: "yongchane/Portfolio",
  owner: "yongchane",
  name: "Portfolio",
  url: "https://github.com/yongchane/Portfolio",
  description: "Portfolio operations console",
  visibility: "public",
  defaultBranch: "develop",
  primaryLanguage: "TypeScript",
};

const project = {
  ...createProjectFromRepo(repo),
  id: "portfolio",
  name: "Portfolio 운영 콘솔",
  summary: "GitHub 기반 프로젝트 관리와 AI 작업 관리를 위한 운영 콘솔",
};

const portfolioAnalysis = analyzeRepoStructure({
  files: [
    "README.md",
    "app/page.tsx",
    "app/ops/projects/page.tsx",
    "app/ops/projects/[projectId]/page.tsx",
    "app/api/ops/projects/[id]/canvas/route.ts",
    "components/ops/project-management/ProjectCanvasPage.tsx",
    "lib/ops/project-management-contract.mjs",
    "supabase/ops-schema.sql",
    "scripts/sync-ops-github.mjs",
    "vercel.json",
  ],
  fileContents: {
    "README.md": "# Portfolio\n\n## Ops Console\n",
    "app/ops/projects/page.tsx": "import { ProjectRepositoryListPage } from '@/components/ops/project-management/ProjectRepositoryListPage';",
    "app/ops/projects/[projectId]/page.tsx": "import { ProjectCanvasPage } from '@/components/ops/project-management/ProjectCanvasPage';",
    "app/api/ops/projects/[id]/canvas/route.ts": "import { getStoredProjectCanvas } from '@/lib/ops/project-canvas-store';",
    "components/ops/project-management/ProjectCanvasPage.tsx": "fetch('/api/ops/projects/portfolio/canvas')",
    "lib/ops/project-management-contract.mjs": "export const buildCanvasModel = () => {};",
  },
});

test("buildManyfastStyleIaFromRoutes creates page hierarchy with linked specs", () => {
  const document = buildPlanningDocumentFromRepoAnalysis({
    project,
    repo,
    analysis: portfolioAnalysis,
    now: "2026-05-16T00:00:00.000Z",
  });

  const projectsPage = document.iaPages.find((page) => page.route === "/ops/projects");
  const detailPage = document.iaPages.find((page) => page.route === "/ops/projects/[projectId]");

  assert.ok(projectsPage, "projects page should exist");
  assert.ok(detailPage, "project detail page should exist");
  assert.equal(projectsPage.depth, 2);
  assert.equal(detailPage.depth, 3);
  assert.equal(detailPage.parentId, projectsPage.id);
  assert.ok(detailPage.linkedSpecificationIds.some((id) => id.includes("ops-projects-project-id")));
  assert.ok(detailPage.evidenceIds.length > 0);
});

test("buildArchitectureModelFromRepoAnalysis separates architecture from IA pages", () => {
  const document = buildPlanningDocumentFromRepoAnalysis({
    project,
    repo,
    analysis: portfolioAnalysis,
  });

  assert.ok(document.architecture.some((node) => node.kind === "api"));
  assert.ok(document.architecture.some((node) => node.kind === "frontend"));
  assert.ok(document.architecture.some((node) => node.kind === "storage"));
  assert.ok(document.architecture.every((node) => Array.isArray(node.evidenceIds)));
  assert.ok(document.iaPages.every((page) => page.id.startsWith("ia-")));
  assert.ok(document.architecture.every((node) => node.id.startsWith("arch-")));
});

test("buildPlanningDocumentFromRepoAnalysis creates Manyfast-style document artifacts", () => {
  const document = buildPlanningDocumentFromRepoAnalysis({
    project,
    repo,
    analysis: portfolioAnalysis,
    now: "2026-05-16T01:00:00.000Z",
  });

  assert.equal(document.id, "planning-portfolio");
  assert.equal(document.projectId, "portfolio");
  assert.equal(document.source, "github");
  assert.equal(document.updatedAt, "2026-05-16T01:00:00.000Z");
  assert.match(document.prd.overview, /GitHub 기반/);
  assert.ok(document.requirements.some((item) => item.id === "req-product-navigation"));
  assert.ok(document.features.some((item) => item.id === "feature-ia-pages"));
  assert.ok(document.specifications.some((item) => item.linkedPageIds.length > 0));
  assert.ok(document.userFlows[0].steps.length > 0);
  assert.ok(document.wireframes.some((item) => item.layoutType === "canvas"));
  assert.ok(document.agentTasks.some((item) => item.linkedSpecificationIds.length > 0));
  assert.ok(document.evidence.some((item) => item.path === "app/ops/projects/[projectId]/page.tsx"));
});

test("buildPlanningDeliverable exports planning docs with traceability", () => {
  const document = buildPlanningDocumentFromRepoAnalysis({
    project,
    repo,
    analysis: portfolioAnalysis,
    now: "2026-05-16T01:00:00.000Z",
  });

  const prd = buildPlanningDeliverable({
    project,
    repo,
    planning: document,
    type: "prd",
    generatedAt: "2026-05-17T00:00:00.000Z",
  });
  const userFlow = buildPlanningDeliverable({
    project,
    repo,
    planning: document,
    type: "user-flow",
    generatedAt: "2026-05-17T00:00:00.000Z",
  });
  const agentBrief = buildPlanningDeliverable({
    project,
    repo,
    planning: document,
    type: "agent-brief",
    generatedAt: "2026-05-17T00:00:00.000Z",
  });

  assert.equal(prd.filename, "portfolio-PRD.md");
  assert.match(prd.content, /Repository: yongchane\/Portfolio/);
  assert.match(prd.content, /Architecture Context/);
  assert.match(prd.content, /Evidence Summary/);
  assert.equal(userFlow.format, "mermaid");
  assert.match(userFlow.content, /flowchart TD/);
  assert.match(userFlow.content, /%% Architecture:/);
  assert.match(userFlow.content, /Specs:/);
  assert.match(agentBrief.content, /Architecture Constraints/);
  assert.match(agentBrief.content, /Evidence Pack/);
});

test("GitHub-first planning handles Pawpong-style repos without Next routes", () => {
  const pawpongRepo = {
    repo: "Pawpong/pawpong_admin_frontend",
    owner: "Pawpong",
    name: "pawpong_admin_frontend",
    url: "https://github.com/Pawpong/pawpong_admin_frontend",
    description: "Pawpong admin frontend",
    visibility: "public",
    defaultBranch: "main",
    primaryLanguage: "TypeScript",
  };
  const pawpongProject = {
    ...createProjectFromRepo(pawpongRepo),
    id: "pawpong",
    name: "Pawpong",
    summary: "브리더 온보딩·상담·신뢰를 중심으로 재설계 중인 반려동물 플랫폼",
  };
  const analysis = analyzeRepoStructure({
    files: [
      "README.md",
      "src/features/auth/api/authApi.ts",
      "src/features/auth/store/authStore.ts",
      "src/shared/api/client.ts",
      "package.json",
      "eslint.config.js",
    ],
    fileContents: {
      "README.md": "# Pawpong Admin\n",
      "src/features/auth/api/authApi.ts": "export async function login(){ return fetch('/api/auth/login'); }",
      "src/shared/api/client.ts": "export const api = {};",
    },
  });

  const document = buildPlanningDocumentFromRepoAnalysis({
    project: pawpongProject,
    repo: pawpongRepo,
    analysis,
  });

  assert.equal(document.iaPages.length, 1, "fallback IA page should be generated");
  assert.equal(document.iaPages[0].source, "github-analysis");
  assert.ok(document.architecture.some((node) => node.kind === "auth"));
  assert.ok(document.evidence.some((item) => item.evidenceType === "auth"));
  assert.ok(document.specifications.length >= 1);
});

test("GitHub-first planning handles Tori service/job-heavy repos", () => {
  const toriRepo = {
    repo: "yongchane/tori-admin",
    owner: "yongchane",
    name: "tori-admin",
    url: "https://github.com/yongchane/tori-admin",
    description: "Tori admin service",
    visibility: "private",
    defaultBranch: "master",
    primaryLanguage: "JavaScript",
  };
  const toriProject = {
    ...createProjectFromRepo(toriRepo),
    id: "tori-house",
    name: "Tori의 집",
    summary: "콘텐츠 운영을 direct DB publish 구조로 전환 중인 Tori public/admin 프로젝트",
  };
  const analysis = analyzeRepoStructure({
    files: [
      "components/DraftEditor.tsx",
      "components/Layout.tsx",
      "lib/admin-data.ts",
      "lib/admin-events.ts",
      "scripts/admin_server.mjs",
      "scripts/build.mjs",
      "package.json",
    ],
    fileContents: {
      "components/DraftEditor.tsx": "import { loadDraft } from '../lib/admin-data';",
      "lib/admin-data.ts": "export async function publish(){ return fetch('/api/publish'); }",
      "scripts/admin_server.mjs": "import '../lib/admin-events';",
    },
  });

  const architecture = buildArchitectureModelFromRepoAnalysis({
    project: toriProject,
    repo: toriRepo,
    analysis,
  });
  const iaPages = buildManyfastStyleIaFromRoutes({
    project: toriProject,
    repo: toriRepo,
    analysis,
  });
  const document = buildPlanningDocumentFromRepoAnalysis({
    project: toriProject,
    repo: toriRepo,
    analysis,
  });

  assert.ok(architecture.some((node) => node.kind === "frontend"));
  assert.ok(architecture.some((node) => node.kind === "service"));
  assert.ok(architecture.some((node) => node.kind === "job"));
  assert.equal(iaPages.length, 1, "job-heavy repo still needs a planning IA placeholder");
  assert.ok(document.prd.goals.some((goal) => goal.includes("Manyfast-style")));
  assert.ok(document.agentTasks[0].linkedArchitectureIds.length > 0);
});
