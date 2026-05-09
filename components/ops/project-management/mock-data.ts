import type { GitHubRepoSnapshot, OpsConsoleData, Project } from "@/lib/ops/types";

export type ProjectCanvasNodeType = "repo" | "page" | "feature" | "api" | "database" | "deploy" | "docs" | "agent" | "start" | "decision" | "export";
export type ProjectCanvasNodeShape = "rect" | "circle" | "diamond" | "note";

export type ProjectCanvasNode = {
  id: string;
  type: ProjectCanvasNodeType;
  shape: ProjectCanvasNodeShape;
  icon: string;
  label: string;
  description: string;
  x: number;
  y: number;
  source: "github-analysis" | "user-created" | "ai-suggestion";
  meta: string[];
  codeRefs: string[];
  interactions: string[];
  apiLinks: string[];
};

export type ProjectCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type ManagedRepo = {
  repo: GitHubRepoSnapshot;
  project?: Project;
  deployUrl?: string;
};

export function getManagedRepos(data: OpsConsoleData): ManagedRepo[] {
  const projectRepoNames = new Set(data.projects.map((project) => project.repo).filter(Boolean));
  const repos = data.github.repoSnapshots.filter((repo) => projectRepoNames.has(repo.repo));
  const fallbackRepos = repos.length ? repos : data.github.repoSnapshots.slice(0, 4);

  return fallbackRepos.map((repo) => {
    const project = data.projects.find((item) => item.repo === repo.repo);
    return { repo, project, deployUrl: project?.deployUrl };
  });
}

export function getAvailableGitHubRepos(data: OpsConsoleData) {
  return data.github.repoSnapshots;
}

export function findRepoByProjectId(data: OpsConsoleData, projectId: string) {
  return data.github.repoSnapshots.find((repo) => toProjectId(repo) === projectId) || data.github.repoSnapshots[0];
}

export function findProjectByRepo(data: OpsConsoleData, repo?: GitHubRepoSnapshot) {
  return repo ? data.projects.find((project) => project.repo === repo.repo) : undefined;
}

export function toProjectId(repo: GitHubRepoSnapshot) {
  return repo.repo.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export function getRepoStatus(repo: GitHubRepoSnapshot, deployUrl?: string) {
  return {
    deployStatus: deployUrl || repo.pushedAt ? "healthy" : "unknown",
    securityStatus: repo.openIssuesCount && repo.openIssuesCount > 5 ? "warning" : "healthy",
    updatedAt: repo.pushedAt || repo.updatedAt || "미기록",
    deployUrl,
  };
}

export const canvasEdges: ProjectCanvasEdge[] = [
  { id: "edge-entry-list", source: "entry", target: "projects-page", label: "route" },
  { id: "edge-list-decision", source: "projects-page", target: "has-project", label: "select" },
  { id: "edge-decision-new", source: "has-project", target: "new-project-page", label: "NO" },
  { id: "edge-new-github", source: "new-project-page", target: "github-api", label: "fetch" },
  { id: "edge-github-db", source: "github-api", target: "database", label: "save" },
  { id: "edge-decision-detail", source: "has-project", target: "project-detail-page", label: "YES" },
  { id: "edge-detail-canvas", source: "project-detail-page", target: "canvas-feature", label: "render" },
  { id: "edge-detail-repo", source: "project-detail-page", target: "repo", label: "analyze" },
  { id: "edge-canvas-export", source: "canvas-feature", target: "export-feature", label: "export" },
  { id: "edge-canvas-review", source: "canvas-feature", target: "agent", label: "review" },
  { id: "edge-repo-api", source: "repo", target: "ops-api", label: "tree" },
  { id: "edge-api-db", source: "ops-api", target: "database", label: "read/write" },
  { id: "edge-deploy-repo", source: "deploy", target: "repo", label: "status" },
  { id: "edge-export-docs", source: "export-feature", target: "docs", label: "store" },
];

const createNode = (node: ProjectCanvasNode): ProjectCanvasNode => node;

export function buildCanvasNodes(repo?: GitHubRepoSnapshot, deployUrl?: string): ProjectCanvasNode[] {
  const repoName = repo?.repo || "unknown/repository";
  return [
    createNode({ id: "entry", type: "start", shape: "circle", icon: "⌘", label: "Ops 진입", description: "운영 콘솔에서 프로젝트 관리 메뉴로 진입합니다.", x: 260, y: 260, source: "user-created", meta: ["/ops", "sidebar"], codeRefs: ["app/ops/page.tsx", "components/ops/OpsRouteShell.tsx"], interactions: ["좌측 메뉴에서 프로젝트 관리 클릭", "사이드바 접기/펼치기"], apiLinks: ["getOpsConsoleData()"] }),
    createNode({ id: "projects-page", type: "page", shape: "rect", icon: "📁", label: "프로젝트 목록 페이지", description: "추가된 레포 목록, 배포 URL, health, 보안 상태를 확인합니다.", x: 480, y: 245, source: "user-created", meta: ["/ops/projects", "레포 카드", "배포 상태"], codeRefs: ["app/ops/projects/page.tsx", "ProjectRepositoryListPage.tsx"], interactions: ["레포 카드 클릭", "GitHub에서 프로젝트 추가 버튼", "배포 URL 확인"], apiLinks: ["GET /api/ops/projects", "future: GET /api/ops/github/repositories"] }),
    createNode({ id: "has-project", type: "decision", shape: "diamond", icon: "?", label: "레포 선택됨?", description: "관리할 프로젝트가 있으면 상세로, 없으면 추가 페이지로 이동합니다.", x: 760, y: 230, source: "user-created", meta: ["YES", "NO"], codeRefs: ["ProjectCanvasPage.tsx"], interactions: ["YES: 상세 canvas 이동", "NO: 프로젝트 추가 페이지 이동"], apiLinks: ["router navigation"] }),
    createNode({ id: "new-project-page", type: "page", shape: "rect", icon: "➕", label: "프로젝트 추가 페이지", description: "GitHub 레포 목록에서 Add to Ops 액션을 수행합니다.", x: 1060, y: 170, source: "user-created", meta: ["/ops/projects/new", "GitHub 목록", "Add to Ops"], codeRefs: ["app/ops/projects/new/page.tsx", "GitHubRepositoryBrowserPage.tsx"], interactions: ["레포 검색/확인", "Add to Ops 클릭", "선택된 레포 저장"], apiLinks: ["future: POST /api/ops/projects", "future: GET /api/ops/github/repositories"] }),
    createNode({ id: "project-detail-page", type: "page", shape: "rect", icon: "🕸️", label: "프로젝트 상세 페이지", description: "선택한 레포의 IA, 기능, 아키텍처 canvas를 편집합니다.", x: 1060, y: 360, source: "user-created", meta: ["/ops/projects/[id]", "canvas", "inspector"], codeRefs: ["app/ops/projects/[projectId]/page.tsx", "ProjectCanvasPage.tsx"], interactions: ["노드 선택", "canvas pan", "zoom", "inspector 상세 확인"], apiLinks: ["future: GET /api/ops/projects/:id/canvas"] }),

    createNode({ id: "github-api", type: "api", shape: "rect", icon: "🐙", label: "GitHub API", description: "레포 목록, branch, tree, 최신 수정 정보를 가져옵니다.", x: 520, y: 1060, source: "github-analysis", meta: ["repos", "trees", "branches"], codeRefs: ["scripts/sync-ops-github.mjs", "data/ops/github-cache.json"], interactions: ["레포 목록 동기화", "파일 트리 분석", "기본 브랜치 확인"], apiLinks: ["GitHub REST API", "future: GET /api/ops/github/repositories"] }),
    createNode({ id: "repo", type: "repo", shape: "rect", icon: "📦", label: repoName, description: "선택한 GitHub 레포입니다. 파일 트리와 운영 상태 분석의 기준입니다.", x: 820, y: 1060, source: "github-analysis", meta: [repo?.defaultBranch ? `default ${repo.defaultBranch}` : "default branch", repo?.visibility || "visibility"], codeRefs: ["GitHub repo snapshot", "data/ops/github-cache.json"], interactions: ["레포 기준으로 IA/API/배포 노드 생성", "GitHub 링크 열기"], apiLinks: ["GitHub repo metadata"] }),
    createNode({ id: "ops-api", type: "api", shape: "rect", icon: "🔌", label: "Ops API", description: "프로젝트, canvas, export, review 데이터를 프론트에 제공합니다.", x: 1120, y: 1160, source: "github-analysis", meta: ["GET projects", "PATCH canvas", "auth"], codeRefs: ["app/api/ops/projects/[id]/route.ts", "future canvas route handlers"], interactions: ["프로젝트 조회", "canvas 저장", "권한 확인"], apiLinks: ["GET /api/ops/projects/:id", "PATCH /api/ops/projects/:id/canvas"] }),
    createNode({ id: "database", type: "database", shape: "rect", icon: "🗄️", label: "Supabase DB", description: "프로젝트와 canvas nodes/edges 저장소입니다.", x: 1420, y: 1160, source: "user-created", meta: ["projects", "canvas_nodes", "canvas_edges"], codeRefs: ["lib/ops/adapters/supabase.ts", "future Supabase tables"], interactions: ["프로젝트 저장", "노드 위치 저장", "edge 관계 저장"], apiLinks: ["Supabase read/write"] }),
    createNode({ id: "deploy", type: "deploy", shape: "rect", icon: "🚀", label: "배포 상태", description: deployUrl ? `실제 배포 주소: ${deployUrl}` : "배포 상태와 운영 URL을 표시합니다.", x: 820, y: 880, source: "github-analysis", meta: [deployUrl || "deploy url pending", "healthy"], codeRefs: ["ProjectRepositoryListPage.tsx", "project.deployUrl"], interactions: ["배포 URL 열기", "health 확인", "운영 상태 비교"], apiLinks: ["future: GET /api/ops/projects/:id/deployments"] }),

    createNode({ id: "canvas-feature", type: "feature", shape: "rect", icon: "✋", label: "Canvas 기능", description: "피그마처럼 보드 이동, 노드 이동, 선택, inspector 확인을 지원합니다.", x: 520, y: 1820, source: "user-created", meta: ["pan", "drag node", "select"], codeRefs: ["ProjectCanvasPage.tsx > beginCanvasPan", "ProjectCanvasPage.tsx > beginNodeDrag"], interactions: ["배경 드래그로 보드 이동", "노드 드래그로 위치 변경", "노드 클릭으로 상세 패널 갱신", "zoom in/out"], apiLinks: ["future: PATCH /api/ops/projects/:id/canvas"] }),
    createNode({ id: "export-feature", type: "feature", shape: "rect", icon: "⬇️", label: "Export 기능", description: "편집한 canvas를 Markdown, PNG, AI 프롬프트로 출력합니다.", x: 820, y: 1820, source: "user-created", meta: ["Markdown", "PNG", "Prompt"], codeRefs: ["ProjectCanvasPage.tsx actions", "future export service"], interactions: ["Markdown Export", "Canvas PNG 다운로드", "AI Agent 리뷰 요청"], apiLinks: ["future: POST /api/ops/projects/:id/canvas/export"] }),
    createNode({ id: "docs", type: "docs", shape: "note", icon: "📝", label: "기능 명세 문서", description: "페이지별 기능/IA/export 결과를 문서로 남깁니다.", x: 1120, y: 1960, source: "user-created", meta: ["페이지별 기능", "IA", "download"], codeRefs: ["future docs export", "docs/plans/"], interactions: ["기능명세 다운로드", "IA 문서 저장", "Markdown 복사"], apiLinks: ["future: POST /api/ops/docs"] }),
    createNode({ id: "agent", type: "agent", shape: "note", icon: "🤖", label: "AI 리뷰", description: "canvas 구조와 아키텍처 위험을 검토합니다.", x: 1120, y: 1760, source: "ai-suggestion", meta: ["architecture", "UX", "risk"], codeRefs: ["future AI review job", "agent run records"], interactions: ["AI 리뷰 요청", "리스크 확인", "개선안 반영"], apiLinks: ["future: POST /api/ops/ai-reviews"] }),
  ];
}
