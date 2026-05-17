const fallbackTimestamp = () => new Date().toISOString();

const normalizeRepoName = (repo) => {
  if (!repo) return "";
  if (typeof repo.repo === "string" && repo.repo) return repo.repo;
  const owner = typeof repo.owner === "string" ? repo.owner : "unknown";
  const name = typeof repo.name === "string" ? repo.name : "repository";
  return `${owner}/${name}`;
};

export const toProjectId = (repo) =>
  normalizeRepoName(repo)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const createProjectFromRepo = (repo, options = {}) => {
  const repoName = normalizeRepoName(repo);
  const projectId = toProjectId(repo);
  const now = options.now || fallbackTimestamp();
  const description = repo.description || `${repoName} repository`;
  const defaultBranch = repo.defaultBranch || "main";

  return {
    id: projectId,
    name: repo.name || repoName.split("/").at(-1) || projectId,
    stage: "planning",
    summary: `${description} 기반 프로젝트 관리 canvas를 준비합니다.`,
    repo: repoName,
    branch: defaultBranch,
    docs: ["GitHub repository", "IA canvas", "Architecture canvas"],
    sectors: [
      {
        id: "project-ia",
        label: "IA / pages",
        status: "doing",
        summary: "GitHub 파일 구조를 페이지와 사용자 흐름으로 해석합니다.",
      },
      {
        id: "project-architecture",
        label: "Architecture",
        status: "todo",
        summary: "API, data source, deployment 관계를 canvas node로 정리합니다.",
      },
      {
        id: "project-agent",
        label: "AI agent workflow",
        status: "todo",
        summary: "AI 리뷰와 수정 제안은 승인 기반 실행으로 연결합니다.",
      },
    ],
    checklist: [
      {
        id: "repo-analysis",
        label: "GitHub repo 구조 분석",
        status: "doing",
      },
      {
        id: "canvas-model",
        label: "IA/architecture canvas 모델 생성",
        status: "todo",
      },
      {
        id: "export-ready",
        label: "Markdown/PNG/Obsidian export 준비",
        status: "todo",
      },
    ],
    operatingCadence: [
      `GitHub cache generated project at ${now}`,
      "Next phase: live GitHub API via NestJS ops-api",
    ],
    adminSurfaces: [
      {
        id: `${projectId}-github`,
        label: "GitHub repository",
        kind: "github",
        status: "doing",
        summary: `${repoName} metadata and future tree analysis source`,
        href: repo.url,
      },
      {
        id: `${projectId}-canvas`,
        label: "Project canvas",
        kind: "console",
        status: "todo",
        summary: "IA, architecture, export, and agent review board",
      },
    ],
    vaultViews: ["Project canvas export", "Architecture notes", "Team meeting material"],
    githubFocus: [
      `default branch: ${defaultBranch}`,
      repo.primaryLanguage ? `primary language: ${repo.primaryLanguage}` : "primary language: unknown",
      "future: file tree analysis through NestJS backend",
    ],
  };
};

export const getManagedRepos = (data) => {
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const repos = Array.isArray(data?.github?.repoSnapshots) ? data.github.repoSnapshots : [];
  const projectByRepo = new Map(
    projects
      .filter((project) => typeof project.repo === "string" && project.repo)
      .map((project) => [project.repo, project]),
  );

  return repos
    .filter((repo) => projectByRepo.has(repo.repo))
    .map((repo) => ({
      repo,
      project: projectByRepo.get(repo.repo),
      deployUrl: projectByRepo.get(repo.repo)?.deployUrl,
    }));
};

export const getAvailableGitHubRepos = (data) => {
  const repos = Array.isArray(data?.github?.repoSnapshots) ? data.github.repoSnapshots : [];
  const projectByRepo = new Map(
    (Array.isArray(data?.projects) ? data.projects : [])
      .filter((project) => typeof project.repo === "string" && project.repo)
      .map((project) => [project.repo, project]),
  );

  return repos.map((repo) => ({
    ...repo,
    managed: projectByRepo.has(repo.repo),
    project: projectByRepo.get(repo.repo),
  }));
};

export const findProjectByProjectId = (data, projectId) => {
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  return (
    projects.find((project) => project.id === projectId) ||
    projects.find((project) => project.repo && toProjectId({ repo: project.repo }) === projectId)
  );
};

export const findRepoByProjectId = (data, projectId) => {
  const repos = Array.isArray(data?.github?.repoSnapshots) ? data.github.repoSnapshots : [];
  const project = findProjectByProjectId(data, projectId);

  if (project?.repo) {
    return repos.find((repo) => repo.repo === project.repo);
  }

  return repos.find((repo) => toProjectId(repo) === projectId);
};

export const findProjectByRepo = (data, repo) =>
  repo && Array.isArray(data?.projects)
    ? data.projects.find((project) => project.repo === repo.repo)
    : undefined;

export const getRepoStatus = (repo, deployUrl) => ({
  deployStatus: deployUrl || repo?.pushedAt ? "healthy" : "unknown",
  securityStatus: repo?.openIssuesCount && repo.openIssuesCount > 5 ? "warning" : "healthy",
  updatedAt: repo?.pushedAt || repo?.updatedAt || "미기록",
  deployUrl,
});

const slugPart = (value) =>
  String(value || "unknown")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const routeFromPath = (filePath) => {
  const route = filePath
    .replace(/^app\//, "/")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/page\.ts$/, "")
    .replace(/\/layout\.tsx$/, "")
    .replace(/\/layout\.ts$/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\/route\.tsx$/, "");

  return route === "" ? "/" : route;
};

const createAnalysisNode = ({
  id,
  type,
  shape = "rect",
  icon,
  label,
  description,
  x,
  y,
  source = "github-analysis",
  meta = [],
  codeRefs = [],
  interactions = [],
  apiLinks = [],
  confidence = 0.82,
  evidence,
}) => ({
  id,
  type,
  shape,
  icon,
  label,
  description,
  x,
  y,
  source,
  meta: [...meta, `confidence ${confidence.toFixed(2)}`],
  codeRefs,
  interactions,
  apiLinks,
  confidence,
  evidence: evidence || codeRefs,
});

const edge = (id, source, target, relation, label = relation) => ({
  id,
  source,
  target,
  relation,
  label,
});

const validNodeTypes = new Set([
  "repo",
  "route",
  "screen",
  "action",
  "page",
  "feature",
  "component",
  "api",
  "service",
  "database",
  "storage",
  "integration",
  "job",
  "security",
  "deploy",
  "deployment",
  "docs",
  "artifact",
  "agent",
  "start",
  "decision",
  "export",
]);

const validNodeShapes = new Set(["rect", "circle", "diamond", "note"]);
const validNodeSources = new Set(["github-analysis", "user-created", "ai-suggestion"]);

const stringArray = (value, limit = 40) =>
  Array.isArray(value)
    ? value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit)
    : [];

const numberInRange = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
};

export const sanitizeCanvasPayload = (input = {}) => {
  const nodes = Array.isArray(input?.nodes) ? input.nodes : [];
  const edges = Array.isArray(input?.edges) ? input.edges : [];
  const sanitizedNodes = nodes
    .map((node, index) => {
      if (!node || typeof node !== "object") return null;
      const id = typeof node.id === "string" && node.id.trim() ? node.id.trim() : `node-${index}`;
      const type = validNodeTypes.has(node.type) ? node.type : "feature";
      const shape = validNodeShapes.has(node.shape) ? node.shape : "rect";
      const source = validNodeSources.has(node.source) ? node.source : "user-created";

      return {
        id,
        type,
        shape,
        icon: typeof node.icon === "string" && node.icon.trim() ? node.icon.trim().slice(0, 12) : "N",
        label: typeof node.label === "string" && node.label.trim() ? node.label.trim().slice(0, 120) : id,
        description: typeof node.description === "string" ? node.description.trim().slice(0, 800) : "",
        x: numberInRange(node.x, 120 + index * 30, 0, 5200),
        y: numberInRange(node.y, 120 + index * 30, 0, 3600),
        source,
        meta: stringArray(node.meta),
        codeRefs: stringArray(node.codeRefs),
        interactions: stringArray(node.interactions),
        apiLinks: stringArray(node.apiLinks),
        confidence: typeof node.confidence === "number" ? numberInRange(node.confidence, 0.75, 0, 1) : undefined,
        evidence: stringArray(node.evidence),
      };
    })
    .filter(Boolean)
    .slice(0, 250);

  const nodeIds = new Set(sanitizedNodes.map((node) => node.id));
  const sanitizedEdges = edges
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const source = typeof item.source === "string" ? item.source.trim() : "";
      const target = typeof item.target === "string" ? item.target.trim() : "";
      if (!nodeIds.has(source) || !nodeIds.has(target)) return null;

      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `edge-${index}`,
        source,
        target,
        relation: typeof item.relation === "string" && item.relation.trim() ? item.relation.trim().slice(0, 60) : "relates",
        label: typeof item.label === "string" && item.label.trim() ? item.label.trim().slice(0, 80) : "relates",
      };
    })
    .filter(Boolean)
    .slice(0, 400);

  return {
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    summary: input?.summary && typeof input.summary === "object" ? input.summary : undefined,
  };
};

export const buildCanvasMarkdown = ({ project, repo, canvas, generatedAt = new Date().toISOString() }) => {
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : [];
  const edges = Array.isArray(canvas?.edges) ? canvas.edges : [];
  const title = project?.name || repo?.repo || "Project Canvas";
  const lines = [
    `# ${title} Canvas`,
    "",
    `- Generated at: ${generatedAt}`,
    `- Repository: ${repo?.repo || project?.repo || "-"}`,
    `- Branch: ${project?.branch || repo?.defaultBranch || "-"}`,
    `- Nodes: ${nodes.length}`,
    `- Edges: ${edges.length}`,
    "",
    "## IA / Architecture Nodes",
    "",
  ];

  for (const node of nodes) {
    lines.push(`### ${node.label || node.id}`);
    lines.push("");
    lines.push(`- Type: ${node.type}`);
    lines.push(`- Source: ${node.source}`);
    if (typeof node.confidence === "number") lines.push(`- Confidence: ${Math.round(node.confidence * 100)}%`);
    if (node.description) lines.push(`- Description: ${node.description}`);
    if (node.codeRefs?.length) lines.push(`- Code refs: ${node.codeRefs.join(", ")}`);
    if (node.apiLinks?.length) lines.push(`- API/Data: ${node.apiLinks.join(", ")}`);
    if (node.interactions?.length) {
      lines.push("- Interactions:");
      node.interactions.forEach((item) => lines.push(`  - ${item}`));
    }
    lines.push("");
  }

  lines.push("## Relations");
  lines.push("");
  if (!edges.length) {
    lines.push("- No edges recorded.");
  } else {
    edges.forEach((item) => lines.push(`- ${item.source} --${item.relation || item.label || "relates"}--> ${item.target}`));
  }

  return `${lines.join("\n")}\n`;
};

const contentFor = (contents, file) => {
  if (!contents || typeof contents !== "object") return "";
  return typeof contents[file] === "string" ? contents[file] : "";
};

const extractImports = (content) => {
  if (!content) return [];
  const imports = [];
  const importFromPattern = /import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match;

  while ((match = importFromPattern.exec(content))) imports.push(match[1]);
  while ((match = dynamicImportPattern.exec(content))) imports.push(match[1]);

  return [...new Set(imports)];
};

const extractApiCalls = (content) => {
  if (!content) return [];
  const apiCalls = [];
  const apiPattern = /["'`]((?:https?:\/\/[^"'`]+)?\/api\/[^"'`\s)]+)["'`]/g;
  let match;

  while ((match = apiPattern.exec(content))) apiCalls.push(match[1]);

  return [...new Set(apiCalls)];
};

const extractMarkdownHeadings = (content) => {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/)?.[2]?.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const countContentSignals = (files, contents) =>
  files.reduce(
    (acc, file) => {
      const content = contentFor(contents, file);
      acc.imports += extractImports(content).length;
      acc.apiCalls += extractApiCalls(content).length;
      acc.headings += extractMarkdownHeadings(content).length;
      if (content) acc.filesWithContent += 1;
      return acc;
    },
    { filesWithContent: 0, imports: 0, apiCalls: 0, headings: 0 },
  );

export const analyzeRepoStructure = (input = {}) => {
  const files = Array.isArray(input) ? input : input.files || [];
  const fileContents = Array.isArray(input) ? {} : input.fileContents || input.contents || {};
  const normalized = files
    .map((file) => (typeof file === "string" ? file : file?.path))
    .filter(Boolean)
    .map((file) => file.replace(/^\.\//, ""))
    .filter((file) => !file.startsWith("node_modules/") && !file.startsWith(".git/") && !file.startsWith(".next/"));

  const routes = normalized.filter((file) => /^app\/.*\/page\.(t|j)sx?$/.test(file) || /^app\/page\.(t|j)sx?$/.test(file));
  const layouts = normalized.filter((file) => /^app\/.*\/layout\.(t|j)sx?$/.test(file) || /^app\/layout\.(t|j)sx?$/.test(file));
  const apiRoutes = normalized.filter((file) => /^app\/api\/.*\/route\.(t|j)sx?$/.test(file));
  const components = normalized.filter((file) => file.startsWith("components/") && /\.(t|j)sx?$/.test(file));
  const services = normalized.filter((file) => file.startsWith("lib/") && /\.(t|j)sx?$/.test(file));
  const storages = normalized.filter((file) => file.startsWith("data/") || file.startsWith("supabase/"));
  const jobs = normalized.filter((file) => file.startsWith("scripts/") || file.startsWith("ops/"));
  const docs = normalized.filter((file) => /\.(md|mdx)$/i.test(file));
  const config = normalized.filter((file) => /(^|\/)(package\.json|next\.config|tsconfig|eslint\.config|vercel\.json|docker|Dockerfile|\.env)/i.test(file));
  const authFiles = normalized.filter((file) => /auth|permission|session|guard|token|oauth/i.test(file));

  const nodes = [];
  const edges = [];
  const contentSignals = countContentSignals(normalized, fileContents);

  const routeNodes = routes.slice(0, 10).map((file, index) => {
    const route = routeFromPath(file);
    const id = `route-${slugPart(route) || "home"}`;
    const content = contentFor(fileContents, file);
    const imports = extractImports(content);
    const apiCalls = extractApiCalls(content);
    return createAnalysisNode({
      id,
      type: "route",
      icon: "R",
      label: route,
      description: "사용자가 접근하는 Next.js 화면 route입니다. IA의 1차 화면 노드로 사용합니다.",
      x: 500 + (index % 5) * 230,
      y: 210 + Math.floor(index / 5) * 145,
      meta: [
        "IA",
        "screen",
        route.includes("[") ? "dynamic route" : "static route",
        imports.length ? `${imports.length} imports` : "imports pending",
        apiCalls.length ? `${apiCalls.length} api calls` : "api calls pending",
      ],
      codeRefs: [file],
      interactions: ["navigate", "render screen", ...imports.filter((item) => item.startsWith("@/components") || item.startsWith("./") || item.startsWith("../")).slice(0, 4).map((item) => `imports ${item}`)],
      apiLinks: apiCalls,
      confidence: content ? 0.97 : 0.94,
    });
  });
  nodes.push(...routeNodes);

  const componentSignals = components.flatMap((file) =>
    extractImports(contentFor(fileContents, file)).map((importPath) => ({ file, importPath })),
  );
  const serviceSignals = services.flatMap((file) =>
    extractImports(contentFor(fileContents, file)).map((importPath) => ({ file, importPath })),
  );
  const apiSignals = apiRoutes.flatMap((file) =>
    extractImports(contentFor(fileContents, file)).map((importPath) => ({ file, importPath })),
  );
  const docHeadings = docs.flatMap((file) =>
    extractMarkdownHeadings(contentFor(fileContents, file)).map((heading) => `${file}: ${heading}`),
  );

  const architectureGroups = [
    {
      id: "analysis-components",
      type: "component",
      icon: "C",
      label: "UI Components",
      description: "화면을 구성하는 feature/shared component 계층입니다.",
      x: 520,
      y: 970,
      files: components,
      relation: "uses",
    },
    {
      id: "analysis-api",
      type: "api",
      icon: "API",
      label: "API Boundary",
      description: "외부 요청과 UI action이 들어오는 endpoint 경계입니다.",
      x: 780,
      y: 970,
      files: apiRoutes,
      relation: "calls",
    },
    {
      id: "analysis-services",
      type: "service",
      icon: "S",
      label: "Domain Services",
      description: "데이터 로드, mutation, adapter, contract 같은 도메인 책임입니다.",
      x: 1040,
      y: 970,
      files: services,
      relation: "calls",
    },
    {
      id: "analysis-storage",
      type: "storage",
      icon: "DB",
      label: "Storage / Schema",
      description: "Supabase schema와 local JSON fallback 저장소입니다.",
      x: 1300,
      y: 970,
      files: storages,
      relation: "writes",
    },
    {
      id: "analysis-jobs",
      type: "job",
      icon: "J",
      label: "Jobs / Automation",
      description: "GitHub sync, ingest, cron, worker 같은 백그라운드 실행 흐름입니다.",
      x: 1560,
      y: 970,
      files: jobs,
      relation: "runs",
    },
    {
      id: "analysis-docs",
      type: "artifact",
      icon: "MD",
      label: "Docs / Decisions",
      description: "README, handoff, plan 문서에서 제품 의도와 설계 근거를 추출합니다.",
      x: 780,
      y: 1780,
      files: docs,
      relation: "documents",
    },
    {
      id: "analysis-security",
      type: "security",
      icon: "SEC",
      label: "Security / Auth",
      description: "session, same-origin, token scope, approval gate 같은 보호 경계입니다.",
      x: 520,
      y: 1320,
      files: authFiles,
      relation: "authenticates",
    },
    {
      id: "analysis-deployment",
      type: "deployment",
      icon: "D",
      label: "Config / Deploy",
      description: "빌드, 환경, 배포 설정과 runtime 제약을 판단하는 근거입니다.",
      x: 1560,
      y: 1320,
      files: config,
      relation: "deploys",
    },
  ];

  architectureGroups
    .filter((group) => group.files.length > 0)
    .forEach((group) => {
      nodes.push(createAnalysisNode({
        id: group.id,
        type: group.type,
        icon: group.icon,
        label: group.label,
        description: group.description,
        x: group.x,
        y: group.y,
        meta: [
          "Architecture",
          `${group.files.length} files`,
          group.id === "analysis-components" && componentSignals.length ? `${componentSignals.length} component imports` : null,
          group.id === "analysis-api" && apiSignals.length ? `${apiSignals.length} api imports` : null,
          group.id === "analysis-services" && serviceSignals.length ? `${serviceSignals.length} service imports` : null,
          group.id === "analysis-docs" && docHeadings.length ? `${docHeadings.length} doc headings` : null,
        ].filter(Boolean),
        codeRefs: group.files.slice(0, 8),
        interactions: [
          `${group.relation} project flow`,
          ...(group.id === "analysis-docs" ? docHeadings.slice(0, 8) : []),
        ],
        apiLinks: group.files.flatMap((file) => extractApiCalls(contentFor(fileContents, file))).slice(0, 8),
        confidence: group.files.length > 1 ? (contentSignals.filesWithContent ? 0.91 : 0.88) : 0.72,
      }));
    });

  routeNodes.forEach((node) => {
    if (components.length) edges.push(edge(`edge-${node.id}-components`, node.id, "analysis-components", "uses"));
    if (apiRoutes.length) edges.push(edge(`edge-${node.id}-api`, node.id, "analysis-api", "calls"));
  });
  if (apiRoutes.length && services.length) edges.push(edge("edge-api-services", "analysis-api", "analysis-services", "calls"));
  if (services.length && storages.length) edges.push(edge("edge-services-storage", "analysis-services", "analysis-storage", "reads/writes"));
  if (jobs.length && storages.length) edges.push(edge("edge-jobs-storage", "analysis-jobs", "analysis-storage", "writes"));
  if (docs.length && routeNodes.length) edges.push(edge("edge-docs-ia", "analysis-docs", routeNodes[0].id, "documents"));
  if (authFiles.length && apiRoutes.length) edges.push(edge("edge-security-api", "analysis-security", "analysis-api", "authenticates"));
  if (config.length && routeNodes.length) edges.push(edge("edge-deploy-route", "analysis-deployment", routeNodes[0].id, "deploys"));

  if (apiSignals.some((signal) => signal.importPath.startsWith("@/lib") || signal.importPath.includes("/lib/"))) {
    edges.push(edge("edge-api-imports-services", "analysis-api", "analysis-services", "imports"));
  }
  if (serviceSignals.some((signal) => /supabase|data\/ops|\.json/i.test(signal.importPath))) {
    edges.push(edge("edge-service-imports-storage", "analysis-services", "analysis-storage", "reads/writes"));
  }
  if (componentSignals.some((signal) => signal.importPath.startsWith("@/lib") || signal.importPath.includes("/lib/"))) {
    edges.push(edge("edge-components-services", "analysis-components", "analysis-services", "imports"));
  }

  return {
    summary: {
      files: normalized.length,
      routes: routes.length,
      layouts: layouts.length,
      apiRoutes: apiRoutes.length,
      components: components.length,
      services: services.length,
      storages: storages.length,
      jobs: jobs.length,
      docs: docs.length,
      config: config.length,
      authFiles: authFiles.length,
      filesWithContent: contentSignals.filesWithContent,
      imports: contentSignals.imports,
      apiCalls: contentSignals.apiCalls,
      docHeadings: contentSignals.headings,
    },
    files: normalized,
    contentSignals: {
      componentImports: componentSignals.slice(0, 20),
      serviceImports: serviceSignals.slice(0, 20),
      apiImports: apiSignals.slice(0, 20),
      docHeadings: docHeadings.slice(0, 20),
    },
    nodes,
    edges,
  };
};

export const canvasEdges = [
  { id: "edge-entry-repo", source: "entry", target: "repo", label: "select" },
  { id: "edge-repo-ia", source: "repo", target: "ops-projects-page", label: "derive IA" },
  { id: "edge-ia-canvas", source: "ops-projects-page", target: "canvas-editor", label: "edit" },
  { id: "edge-repo-api", source: "repo", target: "ops-api", label: "analyze" },
  { id: "edge-api-loader", source: "ops-api", target: "data-loader", label: "contract" },
  { id: "edge-loader-db", source: "data-loader", target: "database", label: "persist" },
  { id: "edge-repo-deploy", source: "repo", target: "deploy", label: "status" },
  { id: "edge-canvas-export", source: "canvas-editor", target: "export-feature", label: "export" },
  { id: "edge-export-docs", source: "export-feature", target: "docs", label: "save" },
  { id: "edge-canvas-agent", source: "canvas-editor", target: "agent", label: "review" },
];

const createNode = (node) => node;

const readableLayoutAnchors = {
  entry: { x: 260, y: 330 },
  repo: { x: 500, y: 300 },
  "canvas-editor": { x: 1600, y: 520 },
  "analysis-components": { x: 500, y: 1160 },
  "analysis-api": { x: 780, y: 1160 },
  "analysis-services": { x: 1060, y: 1160 },
  "analysis-storage": { x: 1340, y: 1160 },
  "analysis-jobs": { x: 1620, y: 1160 },
  "analysis-security": { x: 500, y: 1450 },
  "analysis-deployment": { x: 1620, y: 1450 },
  "analysis-docs": { x: 780, y: 1900 },
  "ops-api": { x: 780, y: 1450 },
  "data-loader": { x: 1060, y: 1450 },
  database: { x: 1340, y: 1450 },
  deploy: { x: 1620, y: 1450 },
  "export-feature": { x: 780, y: 2240 },
  docs: { x: 1060, y: 2240 },
  agent: { x: 1340, y: 2240 },
};

export const applyReadableCanvasLayout = (nodes) => {
  const routeNodes = nodes.filter((node) => node.type === "route" || node.type === "page");
  const routeIndexById = new Map(routeNodes.map((node, index) => [node.id, index]));
  const fallbackArchitectureIndex = new Map();

  return nodes.map((node) => {
    const anchor = readableLayoutAnchors[node.id];
    if (anchor) return { ...node, ...anchor };

    if (routeIndexById.has(node.id)) {
      const index = routeIndexById.get(node.id);
      return {
        ...node,
        x: 760 + (index % 4) * 280,
        y: 210 + Math.floor(index / 4) * 170,
      };
    }

    if (["component", "api", "service", "storage", "database", "job", "security", "deployment", "deploy"].includes(node.type)) {
      const group = node.type;
      const index = fallbackArchitectureIndex.get(group) || 0;
      fallbackArchitectureIndex.set(group, index + 1);
      return {
        ...node,
        x: 500 + (index % 5) * 280,
        y: 1160 + Math.floor(index / 5) * 170,
      };
    }

    return node;
  });
};

export const buildCanvasNodes = (repo, deployUrl, project, analysis) => {
  return buildCanvasModel(repo, deployUrl, project, analysis).nodes;
};

export const buildProjectCanvasResponse = (data, projectId, analysis) => {
  const project = findProjectByProjectId(data, projectId);
  const repo = findRepoByProjectId(data, projectId);

  if (!project && !repo) return null;

  const canvas = buildCanvasModel(repo, project?.deployUrl, project, analysis);

  return {
    projectId,
    project,
    repo,
    canvas,
    source: analysis?.summary ? "repo-analysis" : "static-template",
  };
};

export const buildCanvasModel = (repo, deployUrl, project, analysis) => {
  const repoName = normalizeRepoName(repo);
  const projectName = project?.name || repo?.name || repoName;
  const branch = project?.branch || repo?.defaultBranch || "main";
  const language = repo?.primaryLanguage || "unknown";
  const analysisSummary = analysis?.summary;
  const hasAnalysis = Array.isArray(analysis?.nodes) && analysis.nodes.length > 0;

  const coreNodes = [
    createNode({
      id: "entry",
      type: "start",
      shape: "circle",
      icon: "⌘",
      label: "Ops 진입",
      description: "프로젝트 관리에서 GitHub 기반 프로젝트를 선택합니다.",
      x: 260,
      y: 260,
      source: "user-created",
      meta: ["/ops/projects", "managed project"],
      codeRefs: ["app/ops/projects/page.tsx", "ProjectRepositoryListPage.tsx"],
      interactions: ["프로젝트 카드 클릭", "GitHub에서 프로젝트 추가"],
      apiLinks: ["GET /ops/projects"],
    }),
    createNode({
      id: "repo",
      type: "repo",
      shape: "rect",
      icon: "📦",
      label: repoName,
      description: `${projectName}의 GitHub source입니다. Phase 1에서는 cache metadata를 쓰고 Phase 2에서 NestJS가 live file tree를 읽습니다.`,
      x: 500,
      y: 245,
      source: "github-analysis",
      meta: [
        `branch ${branch}`,
        `language ${language}`,
        repo?.visibility || "visibility unknown",
        analysisSummary ? `${analysisSummary.files} analyzed files` : "analysis pending",
      ],
      codeRefs: ["data/ops/github-cache.json"],
      interactions: ["GitHub 열기", "repo tree 분석 요청", "managed project로 저장"],
      apiLinks: ["future: GET /api/github/repositories/:owner/:repo/tree"],
    }),
    createNode({
      id: "ops-projects-page",
      type: "page",
      shape: "rect",
      icon: "🧭",
      label: "/ops/projects IA",
      description: "관리 repo 목록, GitHub 후보 목록, project detail canvas로 이어지는 정보 구조입니다.",
      x: 820,
      y: 230,
      source: "github-analysis",
      meta: ["repository list", "add flow", "detail route"],
      codeRefs: ["app/ops/projects/page.tsx", "app/ops/projects/new/page.tsx", "app/ops/projects/[projectId]/page.tsx"],
      interactions: ["Add to Ops", "Repo card click", "Canvas inspect"],
      apiLinks: ["POST /api/ops/projects", "GET /api/ops/projects/[id]/canvas"],
    }),
    createNode({
      id: "canvas-editor",
      type: "feature",
      shape: "rect",
      icon: "✍️",
      label: "Sketch canvas",
      description: "노드를 추가/삭제/이동하며 프로젝트 구조와 새 기능 설계를 스케치합니다.",
      x: 1140,
      y: 330,
      source: "user-created",
      meta: ["node edit", "drag", "future save"],
      codeRefs: ["ProjectCanvasPage.tsx"],
      interactions: ["노드 추가", "노드 삭제", "Inspector 편집", "Canvas pan/zoom"],
      apiLinks: ["future: PATCH /api/ops/projects/:id/canvas"],
    }),
    createNode({
      id: "ops-api",
      type: "api",
      shape: "rect",
      icon: "🔌",
      label: "Ops API contract",
      description: "프로젝트 추가, canvas 조회/저장, export, agent review 요청을 담당할 API 경계입니다.",
      x: 520,
      y: 1060,
      source: "github-analysis",
      meta: ["Next route now", "NestJS later", "DTO contract"],
      codeRefs: ["app/api/ops/projects/route.ts", "lib/ops/mutations.ts"],
      interactions: ["project create", "canvas load", "canvas save"],
      apiLinks: ["POST /api/ops/projects", "future: NestJS /projects/:id/canvas"],
    }),
    createNode({
      id: "data-loader",
      type: "api",
      shape: "rect",
      icon: "🧩",
      label: "Loader / Adapter",
      description: "Supabase-first, local fallback 방식으로 UI가 같은 모델을 받도록 정규화합니다.",
      x: 820,
      y: 1060,
      source: "github-analysis",
      meta: ["Supabase first", "local fallback", "typed model"],
      codeRefs: ["lib/ops/data.ts", "lib/ops/supabase-data.ts", "lib/ops/project-management-contract.mjs"],
      interactions: ["load ops data", "normalize project", "build canvas"],
      apiLinks: ["getOpsConsoleData()", "createProjectFromRepo()"],
    }),
    createNode({
      id: "database",
      type: "database",
      shape: "rect",
      icon: "🗄️",
      label: "Ops storage",
      description: "Supabase가 있으면 ops_projects에 저장하고, 없으면 data/ops/projects.json으로 fallback합니다.",
      x: 1130,
      y: 1160,
      source: "user-created",
      meta: ["ops_projects", "data/ops/projects.json", "local fallback"],
      codeRefs: ["supabase/ops-schema.sql", "data/ops/projects.json"],
      interactions: ["persist managed repo", "refresh list", "hydrate canvas"],
      apiLinks: ["Supabase upsert", "local JSON write"],
    }),
    createNode({
      id: "deploy",
      type: "deploy",
      shape: "rect",
      icon: "🚀",
      label: "Deploy / runtime",
      description: deployUrl ? `실제 배포 주소: ${deployUrl}` : "배포 URL과 운영 상태를 project metadata에 연결합니다.",
      x: 1430,
      y: 1060,
      source: "github-analysis",
      meta: [deployUrl || "deploy url pending", repo?.pushedAt || "push time unknown"],
      codeRefs: ["ProjectRepositoryListPage.tsx", "project.deployUrl"],
      interactions: ["배포 URL 열기", "CI/health 확인"],
      apiLinks: ["future: GET /api/ops/projects/:id/deployments"],
    }),
    createNode({
      id: "export-feature",
      type: "export",
      shape: "rect",
      icon: "⬇️",
      label: "Export pipeline",
      description: "Canvas를 Markdown, PNG, AI prompt로 뽑아 회의 자료와 Obsidian 문서로 남깁니다.",
      x: 720,
      y: 1820,
      source: "user-created",
      meta: ["markdown", "png", "obsidian"],
      codeRefs: ["ProjectCanvasPage.tsx actions", "future export service"],
      interactions: ["Markdown Export", "Canvas PNG 다운로드", "Obsidian 저장"],
      apiLinks: ["future: POST /api/ops/projects/:id/canvas/export"],
    }),
    createNode({
      id: "docs",
      type: "docs",
      shape: "note",
      icon: "📝",
      label: "Team material",
      description: "추출한 IA/architecture 내용을 팀 회의용 문서와 Obsidian vault로 저장합니다.",
      x: 1040,
      y: 1950,
      source: "user-created",
      meta: ["meeting", "docs", "vault"],
      codeRefs: ["docs/plans", "docs/ops-supabase-sync.md"],
      interactions: ["회의 자료 공유", "결정사항 기록", "worklog 연결"],
      apiLinks: ["POST /api/ops/ingest"],
    }),
    createNode({
      id: "agent",
      type: "agent",
      shape: "note",
      icon: "🤖",
      label: "AI agent later",
      description: "Cursor처럼 대화 기반으로 구조를 리뷰하고 수정 제안을 만들되, 실제 실행은 승인 뒤 수행합니다.",
      x: 1340,
      y: 1760,
      source: "ai-suggestion",
      meta: ["review", "approval", "agent run"],
      codeRefs: ["components/ops/agents/FloatingAgentPanel.tsx", "app/api/ops/agent-runs/route.ts"],
      interactions: ["AI 리뷰 요청", "수정 방향 제안", "승인 후 실행"],
      apiLinks: ["POST /api/ops/agent-runs", "POST /api/ops/ai-reviews"],
    }),
  ];

  if (!hasAnalysis) {
    return {
      nodes: applyReadableCanvasLayout(coreNodes),
      edges: canvasEdges,
      summary: analysisSummary,
    };
  }

  return {
    nodes: applyReadableCanvasLayout([...coreNodes.slice(0, 2), ...analysis.nodes, ...coreNodes.slice(3)]),
    edges: [
      edge("edge-entry-repo", "entry", "repo", "select"),
      edge("edge-repo-first-route", "repo", analysis.nodes[0].id, "derives", "derive IA"),
      ...analysis.edges,
      edge("edge-analysis-canvas", analysis.nodes[0].id, "canvas-editor", "renders"),
      edge("edge-canvas-export", "canvas-editor", "export-feature", "exports", "export"),
      edge("edge-export-docs", "export-feature", "docs", "documents", "save"),
      edge("edge-canvas-agent", "canvas-editor", "agent", "suggests", "review"),
    ],
    summary: analysisSummary,
  };
};
