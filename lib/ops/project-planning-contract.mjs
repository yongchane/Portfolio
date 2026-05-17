const nowIso = () => new Date().toISOString();

const slugPart = (value) =>
  String(value || "item")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "item";

const unique = (items) => [...new Set(items.filter(Boolean))];

const array = (value) => (Array.isArray(value) ? value : []);

const routeDepth = (route) => {
  if (!route || route === "/") return 1;
  return route.split("/").filter(Boolean).length;
};

const routeParent = (route) => {
  const parts = route.split("/").filter(Boolean);
  if (parts.length <= 1) return undefined;
  return `ia-${slugPart(`/${parts.slice(0, -1).join("/")}`)}`;
};

const humanize = (value) => {
  const cleaned = String(value || "Item")
    .replace(/^\//, "")
    .replace(/\[(.+?)\]/g, "$1")
    .split("/")
    .at(-1)
    ?.replace(/[-_]+/g, " ")
    .trim();
  if (!cleaned) return "Home";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const codeRefsFromNode = (node) => array(node?.codeRefs).filter((item) => typeof item === "string");

const evidenceTypeForPath = (path) => {
  if (/^app\/api\/.*\/route\.(t|j)sx?$/.test(path)) return "api";
  if (/^app\/.*\/page\.(t|j)sx?$/.test(path) || /^pages\/.+\.(t|j)sx?$/.test(path)) return "route";
  if (/components?\//.test(path)) return "component";
  if (/(^|\/)(lib|services?|server)\//.test(path)) return "service";
  if (/supabase|schema|migration|data\/.+\.json/.test(path)) return "schema";
  if (/^scripts\/|^ops\//.test(path)) return "job";
  if (/\.(md|mdx)$/i.test(path)) return "docs";
  if (/auth|session|token|oauth|guard|permission/i.test(path)) return "auth";
  if (/package\.json|config|vercel\.json|docker|Dockerfile|tsconfig|eslint/i.test(path)) return "config";
  return "config";
};

const buildEvidence = ({ repo, branch, analysis }) => {
  const files = array(analysis?.files);
  const nodeRefs = array(analysis?.nodes).flatMap((node) => codeRefsFromNode(node));
  const paths = unique([...files, ...nodeRefs]);
  const docHeadings = array(analysis?.contentSignals?.docHeadings);
  const importSignals = [
    ...array(analysis?.contentSignals?.componentImports),
    ...array(analysis?.contentSignals?.serviceImports),
    ...array(analysis?.contentSignals?.apiImports),
  ];

  return paths.map((path, index) => {
    const imports = importSignals
      .filter((signal) => signal.file === path)
      .map((signal) => signal.importPath)
      .slice(0, 12);
    const headings = docHeadings
      .filter((heading) => heading.startsWith(`${path}:`))
      .map((heading) => heading.replace(`${path}:`, "").trim())
      .slice(0, 8);
    const evidenceType = evidenceTypeForPath(path);

    return {
      id: `evidence-${index + 1}-${slugPart(path)}`,
      repo: repo?.repo || "unknown/repository",
      branch: branch || repo?.defaultBranch || "main",
      path,
      evidenceType,
      summary: `${evidenceType} signal from ${path}`,
      imports,
      apiCalls: [],
      headings,
      confidence: evidenceType === "route" || evidenceType === "api" ? 0.9 : 0.76,
    };
  });
};

const evidenceIdsForRefs = (evidence, refs) => {
  const refSet = new Set(array(refs));
  return evidence.filter((item) => refSet.has(item.path)).map((item) => item.id);
};

const routeNodes = (analysis) =>
  array(analysis?.nodes).filter((node) => node?.type === "route" && typeof node.label === "string");

export const buildManyfastStyleIaFromRoutes = ({ project, repo, analysis, evidence = [] } = {}) => {
  const routes = routeNodes(analysis);
  const pagesById = new Map();

  for (const node of routes) {
    const route = node.label || "/";
    const page = {
      id: `ia-${slugPart(route) || "home"}`,
      projectId: project?.id || "unknown-project",
      title: route === "/" ? "Home" : humanize(route),
      route,
      depth: routeDepth(route),
      parentId: routeParent(route),
      description: node.description || `${route} page inferred from GitHub route files.`,
      linkedSpecificationIds: [`spec-${slugPart(route)}-page-behavior`],
      linkedUserFlowStepIds: [`flow-step-${slugPart(route)}-visit`],
      linkedWireframeBlockIds: [`wire-${slugPart(route)}-main`],
      evidenceIds: evidenceIdsForRefs(evidence, node.codeRefs),
      source: "github-analysis",
      confidence: typeof node.confidence === "number" ? node.confidence : 0.82,
    };
    pagesById.set(page.id, page);
  }

  if (!pagesById.size) {
    const fallbackId = `ia-${slugPart(project?.id || repo?.name || "project")}`;
    pagesById.set(fallbackId, {
      id: fallbackId,
      projectId: project?.id || "unknown-project",
      title: project?.name || repo?.name || "Project Home",
      route: undefined,
      depth: 1,
      parentId: undefined,
      description: "No explicit route files were detected; this IA page is a planning placeholder.",
      linkedSpecificationIds: [`spec-${slugPart(project?.id || repo?.name || "project")}-overview`],
      linkedUserFlowStepIds: [`flow-step-${slugPart(project?.id || repo?.name || "project")}-open`],
      linkedWireframeBlockIds: [`wire-${slugPart(project?.id || repo?.name || "project")}-main`],
      evidenceIds: [],
      source: "github-analysis",
      confidence: 0.45,
    });
  }

  return [...pagesById.values()].sort((a, b) => a.depth - b.depth || String(a.route || a.title).localeCompare(String(b.route || b.title)));
};

export const buildArchitectureModelFromRepoAnalysis = ({ project, analysis, evidence = [] } = {}) =>
  array(analysis?.nodes)
    .filter((node) => ["component", "api", "service", "storage", "database", "job", "security", "deployment", "deploy", "integration"].includes(node?.type))
    .map((node) => ({
      id: `arch-${slugPart(node.id || node.label)}`,
      projectId: project?.id || "unknown-project",
      kind: node.type === "component"
        ? "frontend"
        : node.type === "deployment" || node.type === "deploy"
          ? "deploy"
          : node.type === "security"
            ? "auth"
            : node.type === "storage"
              ? "storage"
              : node.type,
      label: node.label,
      description: node.description,
      codeRefs: codeRefsFromNode(node),
      apiLinks: array(node.apiLinks),
      evidenceIds: evidenceIdsForRefs(evidence, node.codeRefs),
      confidence: typeof node.confidence === "number" ? node.confidence : 0.78,
      source: node.source || "github-analysis",
    }));

const buildRequirements = ({ project, analysis }) => {
  const hasRoutes = Number(analysis?.summary?.routes || 0) > 0;
  const hasApis = Number(analysis?.summary?.apiRoutes || 0) > 0;
  const hasStorage = Number(analysis?.summary?.storages || 0) > 0;
  const base = [
    {
      id: "req-product-navigation",
      title: "Product navigation and page structure",
      description: "Manyfast-style IA should explain how users move through the product pages.",
      priority: "high",
      status: hasRoutes ? "doing" : "todo",
    },
    {
      id: "req-feature-specification",
      title: "Feature specification directory",
      description: "Requirements, features, and detailed specifications should be traceable to IA pages.",
      priority: "high",
      status: "todo",
    },
    {
      id: "req-system-architecture",
      title: "Evidence-backed system architecture",
      description: "API, service, storage, jobs, auth, and deployment boundaries should be visible with code evidence.",
      priority: "high",
      status: hasApis || hasStorage ? "doing" : "todo",
    },
  ];

  if (project?.repo) {
    base.push({
      id: "req-github-evidence",
      title: "GitHub evidence and implementation traceability",
      description: `Planning artifacts should link back to ${project.repo} files, imports, docs, and API routes.`,
      priority: "high",
      status: "doing",
    });
  }

  return base;
};

const buildFeatures = ({ iaPages, architecture }) => {
  const features = [
    {
      id: "feature-ia-pages",
      requirementId: "req-product-navigation",
      title: "IA page hierarchy",
      description: "Render product pages as depth-based IA items linked to specs and evidence.",
      userRoleIds: ["role-operator", "role-developer"],
      status: iaPages.length ? "doing" : "todo",
    },
    {
      id: "feature-spec-directory",
      requirementId: "req-feature-specification",
      title: "Specification directory",
      description: "Keep Requirement -> Feature -> Specification relationships separate from canvas layout.",
      userRoleIds: ["role-operator", "role-developer"],
      status: "todo",
    },
    {
      id: "feature-architecture-graph",
      requirementId: "req-system-architecture",
      title: "Architecture graph",
      description: "Show implementation architecture as a graph while preserving code evidence.",
      userRoleIds: ["role-developer"],
      status: architecture.length ? "doing" : "todo",
    },
  ];

  return features;
};

const buildSpecifications = ({ iaPages, architecture }) => {
  const pageSpecs = iaPages.slice(0, 20).map((page) => ({
    id: `spec-${slugPart(page.route || page.title)}-page-behavior`,
    featureId: "feature-ia-pages",
    title: `${page.title} page behavior`,
    behavior: page.route
      ? `User can navigate to ${page.route} and complete the page's primary task.`
      : `User can open ${page.title} and understand the project state.`,
    acceptanceCriteria: [
      "Page has a clear purpose.",
      "Page is linked to at least one feature or planning item.",
      "Page includes GitHub evidence when inferred from code.",
    ],
    edgeCases: ["Route may be dynamic.", "Source files may not contain enough content for high-confidence analysis."],
    linkedPageIds: [page.id],
    linkedApiIds: [],
    evidenceIds: page.evidenceIds,
  }));

  const architectureSpecs = architecture.slice(0, 12).map((node) => ({
    id: `spec-${slugPart(node.id)}-architecture-contract`,
    featureId: "feature-architecture-graph",
    title: `${node.label} architecture contract`,
    behavior: `${node.label} should be represented as a durable architecture item with code evidence.`,
    acceptanceCriteria: [
      "Architecture node has implementation evidence.",
      "Architecture node is visually linked on the canvas.",
      "Architecture node can be exported into implementation briefs.",
    ],
    edgeCases: ["Generated groups may hide important file-level details."],
    linkedPageIds: [],
    linkedApiIds: node.apiLinks,
    evidenceIds: node.evidenceIds,
  }));

  return [...pageSpecs, ...architectureSpecs];
};

const buildUserFlows = ({ iaPages }) => {
  const pages = iaPages.slice(0, 8);
  return [
    {
      id: "flow-primary-project-journey",
      title: "Primary project journey",
      actorRoleId: "role-operator",
      steps: pages.map((page, index) => ({
        id: `flow-step-${slugPart(page.route || page.title)}-visit`,
        pageId: page.id,
        action: index === 0 ? `Open ${page.title}` : `Navigate to ${page.title}`,
        systemResponse: page.description,
        nextStepIds: pages[index + 1] ? [`flow-step-${slugPart(pages[index + 1].route || pages[index + 1].title)}-visit`] : [],
        linkedSpecificationIds: page.linkedSpecificationIds,
      })),
    },
  ];
};

const buildWireframes = ({ iaPages }) =>
  iaPages.slice(0, 20).map((page, index) => ({
    id: `wire-${slugPart(page.route || page.title)}-main`,
    pageId: page.id,
    sectionName: `${page.title} main content`,
    layoutType: page.route?.includes("projects") ? "canvas" : "custom",
    contentPurpose: `Represent the primary content and actions for ${page.title}.`,
    linkedSpecificationIds: page.linkedSpecificationIds,
    evidenceIds: page.evidenceIds,
    order: index + 1,
  }));

const buildAgentTasks = ({ project, specifications, architecture }) => [
  {
    id: `agent-task-${slugPart(project?.id || "project")}-planning-review`,
    projectId: project?.id || "unknown-project",
    title: "Review generated planning model",
    description: "Validate PRD, specs, IA, architecture, and evidence before implementation.",
    linkedSpecificationIds: specifications.slice(0, 8).map((spec) => spec.id),
    linkedArchitectureIds: architecture.slice(0, 8).map((node) => node.id),
    status: "todo",
  },
];

export const buildPlanningCanvasModel = (planning = {}) => {
  const nodes = [];
  const edges = [];
  const iaPages = array(planning.iaPages);
  const architecture = array(planning.architecture);
  const specifications = array(planning.specifications);
  const wireframes = array(planning.wireframes);
  const evidence = array(planning.evidence);

  nodes.push({
    id: "planning-root",
    type: "start",
    shape: "circle",
    icon: "P",
    label: "Planning Root",
    description: "GitHub 분석으로 생성된 PRD, IA, 명세, 아키텍처의 시작점입니다.",
    x: 260,
    y: 330,
    source: "ai-suggestion",
    meta: ["planning", planning.source || "github"],
    codeRefs: [],
    interactions: ["Generate planning from GitHub"],
    apiLinks: ["POST /api/ops/projects/:id/planning/generate"],
    confidence: 0.9,
    evidence: [],
  });

  iaPages.slice(0, 12).forEach((page, index) => {
    const refs = evidence.filter((item) => array(page.evidenceIds).includes(item.id)).map((item) => item.path);
    nodes.push({
      id: `canvas-${page.id}`,
      type: "page",
      shape: "rect",
      icon: "IA",
      label: page.route || page.title,
      description: page.description,
      x: 640 + ((page.depth || 1) - 1) * 260,
      y: 210 + index * 120,
      source: page.source === "manual" ? "user-created" : "github-analysis",
      meta: [`depth ${page.depth || 1}`, `${array(page.linkedSpecificationIds).length} specs`],
      codeRefs: refs.slice(0, 6),
      interactions: [`IA page ${page.title}`, ...array(page.linkedUserFlowStepIds).slice(0, 3)],
      apiLinks: [],
      confidence: page.confidence,
      evidence: array(page.evidenceIds),
    });

    edges.push({
      id: `edge-planning-root-${page.id}`,
      source: "planning-root",
      target: `canvas-${page.id}`,
      relation: page.parentId ? "contains" : "starts",
      label: page.parentId ? "contains" : "IA",
    });
  });

  specifications.slice(0, 8).forEach((spec, index) => {
    const linkedPageId = array(spec.linkedPageIds)[0];
    const refs = evidence.filter((item) => array(spec.evidenceIds).includes(item.id)).map((item) => item.path);
    nodes.push({
      id: `canvas-${spec.id}`,
      type: "feature",
      shape: "rect",
      icon: "S",
      label: spec.title,
      description: spec.behavior,
      x: 1600,
      y: 210 + index * 120,
      source: spec.source === "manual" ? "user-created" : "github-analysis",
      meta: [`${array(spec.acceptanceCriteria).length} acceptance`, spec.status || "todo"],
      codeRefs: refs.slice(0, 6),
      interactions: array(spec.acceptanceCriteria).slice(0, 4),
      apiLinks: array(spec.linkedApiIds),
      confidence: 0.82,
      evidence: array(spec.evidenceIds),
    });
    if (linkedPageId) {
      edges.push({
        id: `edge-${linkedPageId}-${spec.id}`,
        source: `canvas-${linkedPageId}`,
        target: `canvas-${spec.id}`,
        relation: "specifies",
        label: "spec",
      });
    }
  });

  architecture.slice(0, 10).forEach((item, index) => {
    nodes.push({
      id: `canvas-${item.id}`,
      type: item.kind === "frontend" ? "component" : item.kind === "auth" ? "security" : item.kind === "database" ? "database" : item.kind === "deploy" ? "deploy" : item.kind,
      shape: "rect",
      icon: String(item.kind || "A").toUpperCase().slice(0, 3),
      label: item.label,
      description: item.description,
      x: 520 + (index % 5) * 280,
      y: 1160 + Math.floor(index / 5) * 170,
      source: item.source === "manual" ? "user-created" : "github-analysis",
      meta: [item.kind, `${array(item.codeRefs).length} refs`],
      codeRefs: array(item.codeRefs).slice(0, 8),
      interactions: [`Architecture ${item.kind}`],
      apiLinks: array(item.apiLinks),
      confidence: item.confidence,
      evidence: array(item.evidenceIds),
    });
  });

  wireframes.slice(0, 8).forEach((wireframe, index) => {
    const refs = evidence.filter((item) => array(wireframe.evidenceIds).includes(item.id)).map((item) => item.path);
    nodes.push({
      id: `canvas-${wireframe.id}`,
      type: "screen",
      shape: "note",
      icon: "WF",
      label: wireframe.sectionName,
      description: wireframe.contentPurpose,
      x: 520 + (index % 4) * 280,
      y: 2060 + Math.floor(index / 4) * 150,
      source: wireframe.source === "manual" ? "user-created" : "github-analysis",
      meta: [wireframe.layoutType, `order ${wireframe.order ?? index}`],
      codeRefs: refs.slice(0, 4),
      interactions: array(wireframe.linkedSpecificationIds).slice(0, 4),
      apiLinks: [],
      confidence: 0.78,
      evidence: array(wireframe.evidenceIds),
    });
  });

  return {
    nodes,
    edges,
    summary: {
      iaPages: iaPages.length,
      specifications: specifications.length,
      architecture: architecture.length,
      wireframes: wireframes.length,
      evidence: evidence.length,
    },
  };
};

export const buildPlanningDocumentFromRepoAnalysis = ({ project, repo, analysis, now = nowIso() } = {}) => {
  const branch = project?.branch || repo?.defaultBranch || "main";
  const evidence = buildEvidence({ repo, branch, analysis });
  const iaPages = buildManyfastStyleIaFromRoutes({ project, repo, analysis, evidence });
  const architecture = buildArchitectureModelFromRepoAnalysis({ project, repo, analysis, evidence });
  const requirements = buildRequirements({ project, analysis });
  const features = buildFeatures({ iaPages, architecture });
  const specifications = buildSpecifications({ iaPages, architecture });
  const userFlows = buildUserFlows({ iaPages });
  const wireframes = buildWireframes({ iaPages });

  const document = {
    id: `planning-${slugPart(project?.id || repo?.repo || "project")}`,
    projectId: project?.id || "unknown-project",
    source: "github",
    prd: {
      overview: project?.summary || repo?.description || `${repo?.repo || "Project"} planning document generated from GitHub analysis.`,
      goals: [
        "Create a Manyfast-style planning document from the existing implementation.",
        "Keep IA, specifications, architecture, and GitHub evidence traceable.",
        "Support canvas-based project development and AI agent handoff.",
      ],
      targetUsers: [
        {
          id: "role-operator",
          name: "Project operator",
          description: "Uses the ops console to understand, plan, and manage projects.",
        },
        {
          id: "role-developer",
          name: "Developer / AI agent",
          description: "Uses evidence-backed specs and architecture to safely modify code.",
        },
      ],
      coreValues: [
        "Code-backed planning",
        "Traceable IA and specs",
        "Approval-based AI execution",
      ],
      scenarios: [
        "Analyze an existing GitHub repo into planning artifacts.",
        "Edit IA/specs on a Figma-style canvas.",
        "Export implementation briefs for humans or agents.",
      ],
      successMetrics: [
        `${analysis?.summary?.files || 0} files analyzed`,
        `${iaPages.length} IA pages generated`,
        `${architecture.length} architecture nodes generated`,
        `${evidence.length} evidence items generated`,
      ],
      risks: [
        "GitHub analysis may miss runtime-only behavior.",
        "Route-only IA can under-represent product intent until specs are reviewed.",
      ],
      openQuestions: [
        "Which generated specs should become implementation tasks first?",
        "Which AI suggestions should require explicit approval?",
      ],
    },
    requirements,
    features,
    specifications,
    iaPages,
    userFlows,
    wireframes,
    architecture,
    canvas: {},
    agentTasks: buildAgentTasks({ project, specifications, architecture }),
    evidence,
    updatedAt: now,
  };

  return {
    ...document,
    canvas: buildPlanningCanvasModel(document),
  };
};

export const planningExportTypes = [
  "prd",
  "specifications",
  "ia",
  "user-flow",
  "architecture",
  "agent-brief",
  "canvas",
];

const lineList = (items = [], fallback = "-") => {
  const rows = array(items).filter(Boolean);
  return rows.length ? rows.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
};

const numberedList = (items = [], fallback = "-") => {
  const rows = array(items).filter(Boolean);
  return rows.length ? rows.map((item, index) => `${index + 1}. ${item}`).join("\n") : `1. ${fallback}`;
};

const evidencePaths = (planning, ids = []) => {
  const idSet = new Set(array(ids));
  return array(planning?.evidence)
    .filter((item) => idSet.has(item.id))
    .map((item) => `${item.path} (${item.evidenceType || "evidence"})`);
};

const projectHeader = ({ project, repo, planning, generatedAt }) => {
  const projectName = project?.name || planning?.projectId || "Project";
  const repoName = repo?.repo || project?.repo || array(planning?.evidence)[0]?.repo || "unknown/repository";
  return [
    `Project: ${projectName}`,
    `Project ID: ${planning?.projectId || project?.id || "unknown"}`,
    `Repository: ${repoName}`,
    `Generated At: ${generatedAt}`,
  ].join("\n");
};

const linkedSpecsForPage = (planning, page) => {
  const ids = new Set(array(page?.linkedSpecificationIds));
  return array(planning?.specifications).filter((spec) => ids.has(spec.id));
};

const buildPrdMarkdown = ({ project, repo, planning, generatedAt }) => {
  const prd = planning?.prd || {};
  return [
    `# ${project?.name || planning?.projectId || "Project"} PRD`,
    "",
    projectHeader({ project, repo, planning, generatedAt }),
    "",
    "## Overview",
    prd.overview || "No overview recorded.",
    "",
    "## Goals",
    lineList(prd.goals, "No goals recorded."),
    "",
    "## Target Users",
    lineList(array(prd.targetUsers).map((role) => `${role.name}: ${role.description}`), "No target users recorded."),
    "",
    "## Core Values",
    lineList(prd.coreValues, "No core values recorded."),
    "",
    "## Scenarios",
    numberedList(prd.scenarios, "No scenarios recorded."),
    "",
    "## Success Metrics",
    lineList(prd.successMetrics, "No success metrics recorded."),
    "",
    "## Risks",
    lineList(prd.risks, "No risks recorded."),
    "",
    "## Open Questions",
    lineList(prd.openQuestions, "No open questions recorded."),
    "",
    "## Architecture Context",
    lineList(array(planning?.architecture).map((node) => `${node.kind}: ${node.label}`), "No architecture recorded."),
    "",
    "## Evidence Summary",
    lineList(array(planning?.evidence).slice(0, 20).map((item) => `${item.path} (${item.evidenceType})`), "No evidence recorded."),
  ].join("\n");
};

const buildSpecificationsMarkdown = ({ project, repo, planning, generatedAt }) => {
  const requirements = array(planning?.requirements);
  const features = array(planning?.features);
  const specs = array(planning?.specifications);
  return [
    `# ${project?.name || planning?.projectId || "Project"} Functional Spec`,
    "",
    projectHeader({ project, repo, planning, generatedAt }),
    "",
    ...requirements.flatMap((requirement) => {
      const requirementFeatures = features.filter((feature) => feature.requirementId === requirement.id);
      return [
        `## Requirement: ${requirement.title}`,
        "",
        requirement.description || "",
        "",
        `Priority: ${requirement.priority || "medium"} · Status: ${requirement.status || "todo"}`,
        "",
        ...requirementFeatures.flatMap((feature) => {
          const featureSpecs = specs.filter((spec) => spec.featureId === feature.id);
          return [
            `### Feature: ${feature.title}`,
            "",
            feature.description || "",
            "",
            ...featureSpecs.flatMap((spec) => [
              `#### Spec: ${spec.title}`,
              "",
              spec.behavior || "",
              "",
              "Acceptance Criteria:",
              lineList(spec.acceptanceCriteria, "No acceptance criteria recorded."),
              "",
              "Edge Cases:",
              lineList(spec.edgeCases, "No edge cases recorded."),
              "",
              `Linked IA Pages: ${array(spec.linkedPageIds).join(", ") || "-"}`,
              `Linked APIs: ${array(spec.linkedApiIds).join(", ") || "-"}`,
              "",
              "Evidence:",
              lineList(evidencePaths(planning, spec.evidenceIds), "No evidence linked."),
              "",
            ]),
          ];
        }),
      ];
    }),
    "## Architecture Coverage",
    lineList(array(planning?.architecture).map((node) => `${node.label}: ${array(node.apiLinks).join(", ") || array(node.codeRefs).slice(0, 3).join(", ") || "no links"}`), "No architecture recorded."),
  ].join("\n");
};

const buildIaMarkdown = ({ project, repo, planning, generatedAt }) => [
  `# ${project?.name || planning?.projectId || "Project"} IA`,
  "",
  projectHeader({ project, repo, planning, generatedAt }),
  "",
  "## Page Tree",
  "",
  ...array(planning?.iaPages).flatMap((page) => {
    const indent = "  ".repeat(Math.max(0, Number(page.depth || 1) - 1));
    const specs = linkedSpecsForPage(planning, page);
    return [
      `${indent}- ${page.title}${page.route ? ` (${page.route})` : ""}`,
      `${indent}  - Description: ${page.description || "-"}`,
      `${indent}  - Linked specs: ${specs.map((spec) => spec.title).join(", ") || "-"}`,
      `${indent}  - Wireframes: ${array(page.linkedWireframeBlockIds).join(", ") || "-"}`,
      `${indent}  - Evidence: ${evidencePaths(planning, page.evidenceIds).join(", ") || "-"}`,
    ];
  }),
  "",
  "## Architecture Links",
  lineList(array(planning?.architecture).map((node) => `${node.kind}: ${node.label}`), "No architecture recorded."),
].join("\n");

const mermaidId = (value) => `n_${slugPart(value).replace(/-/g, "_")}`;

const buildUserFlowMermaid = ({ project, repo, planning, generatedAt }) => {
  const lines = [
    "flowchart TD",
    `  %% Project: ${project?.name || planning?.projectId || "Project"}`,
    `  %% Repository: ${repo?.repo || project?.repo || array(planning?.evidence)[0]?.repo || "unknown/repository"}`,
    `  %% Generated At: ${generatedAt}`,
    `  %% Architecture: ${array(planning?.architecture).map((node) => node.label).slice(0, 8).join(", ") || "none"}`,
  ];

  for (const flow of array(planning?.userFlows)) {
    lines.push(`  subgraph ${mermaidId(flow.id)}["${String(flow.title || "User Flow").replace(/"/g, "'")}"]`);
    for (const step of array(flow.steps)) {
      const specs = array(step.linkedSpecificationIds).join(", ") || "no specs";
      const page = array(planning?.iaPages).find((item) => item.id === step.pageId);
      lines.push(`    ${mermaidId(step.id)}["${String(step.action || "Action").replace(/"/g, "'")}<br/>Page: ${String(page?.route || page?.title || "-").replace(/"/g, "'")}<br/>Specs: ${specs}"]`);
      for (const nextId of array(step.nextStepIds)) {
        lines.push(`    ${mermaidId(step.id)} --> ${mermaidId(nextId)}`);
      }
    }
    lines.push("  end");
  }

  lines.push("  %% Evidence");
  for (const item of array(planning?.evidence).slice(0, 12)) {
    lines.push(`  %% - ${item.path} (${item.evidenceType})`);
  }
  return lines.join("\n");
};

const buildArchitectureMarkdown = ({ project, repo, planning, generatedAt }) => [
  `# ${project?.name || planning?.projectId || "Project"} Architecture`,
  "",
  projectHeader({ project, repo, planning, generatedAt }),
  "",
  "## System Nodes",
  "",
  ...array(planning?.architecture).flatMap((node) => [
    `### ${node.label}`,
    "",
    `Kind: ${node.kind}`,
    "",
    node.description || "",
    "",
    "Code References:",
    lineList(node.codeRefs, "No code references linked."),
    "",
    "API / Data Links:",
    lineList(node.apiLinks, "No API links recorded."),
    "",
    "Evidence:",
    lineList(evidencePaths(planning, node.evidenceIds), "No evidence linked."),
    "",
  ]),
  "## IA Touchpoints",
  lineList(array(planning?.iaPages).map((page) => `${page.title}${page.route ? `: ${page.route}` : ""}`), "No IA pages recorded."),
  "",
  "## Specification Touchpoints",
  lineList(array(planning?.specifications).slice(0, 20).map((spec) => spec.title), "No specifications recorded."),
].join("\n");

const buildAgentBriefMarkdown = ({ project, repo, planning, generatedAt }) => [
  `# ${project?.name || planning?.projectId || "Project"} Agent Implementation Brief`,
  "",
  projectHeader({ project, repo, planning, generatedAt }),
  "",
  "## Objective",
  planning?.prd?.overview || "Use this brief to safely continue implementation from planning artifacts.",
  "",
  "## Operating Rules",
  lineList([
    "Use approval-based changes for AI-generated suggestions.",
    "Preserve GitHub evidence links when changing IA, specs, or architecture.",
    "Update planning and canvas together when an approved change affects structure.",
  ]),
  "",
  "## Implementation Candidates",
  lineList(array(planning?.agentTasks).map((task) => `${task.status || "todo"}: ${task.title} - ${task.description}`), "No agent tasks recorded."),
  "",
  "## Priority Specs",
  lineList(array(planning?.specifications).slice(0, 12).map((spec) => `${spec.title}: ${spec.behavior}`), "No specifications recorded."),
  "",
  "## Architecture Constraints",
  lineList(array(planning?.architecture).map((node) => `${node.kind}: ${node.label} (${array(node.codeRefs).slice(0, 2).join(", ") || "no refs"})`), "No architecture recorded."),
  "",
  "## Evidence Pack",
  lineList(array(planning?.evidence).slice(0, 30).map((item) => `${item.path} (${item.evidenceType})`), "No evidence recorded."),
].join("\n");

const buildCanvasMarkdownFromPlanning = ({ project, repo, planning, generatedAt }) => [
  `# ${project?.name || planning?.projectId || "Project"} Planning Canvas`,
  "",
  projectHeader({ project, repo, planning, generatedAt }),
  "",
  "## Canvas Summary",
  lineList(Object.entries(planning?.canvas?.summary || {}).map(([key, value]) => `${key}: ${value}`), "No canvas summary recorded."),
  "",
  "## Nodes",
  lineList(array(planning?.canvas?.nodes).map((node) => `${node.type}: ${node.label} - ${node.description}`), "No canvas nodes recorded."),
  "",
  "## Edges",
  lineList(array(planning?.canvas?.edges).map((edge) => `${edge.source} -> ${edge.target}: ${edge.label}`), "No canvas edges recorded."),
  "",
  "## Architecture Included",
  lineList(array(planning?.architecture).map((node) => `${node.kind}: ${node.label}`), "No architecture recorded."),
  "",
  "## Evidence Included",
  lineList(array(planning?.evidence).slice(0, 20).map((item) => `${item.path} (${item.evidenceType})`), "No evidence recorded."),
].join("\n");

export const buildPlanningDeliverable = ({ project, repo, planning, type = "prd", generatedAt = nowIso() } = {}) => {
  const exportType = planningExportTypes.includes(type) ? type : "prd";
  const projectId = planning?.projectId || project?.id || slugPart(repo?.repo || "project");
  const builders = {
    prd: { format: "md", filename: `${projectId}-PRD.md`, content: buildPrdMarkdown },
    specifications: { format: "md", filename: `${projectId}-Functional-Spec.md`, content: buildSpecificationsMarkdown },
    ia: { format: "md", filename: `${projectId}-IA.md`, content: buildIaMarkdown },
    "user-flow": { format: "mermaid", filename: `${projectId}-User-Flow.mermaid`, content: buildUserFlowMermaid },
    architecture: { format: "md", filename: `${projectId}-Architecture.md`, content: buildArchitectureMarkdown },
    "agent-brief": { format: "md", filename: `${projectId}-Agent-Implementation-Brief.md`, content: buildAgentBriefMarkdown },
    canvas: { format: "md", filename: `${projectId}-Planning-Canvas.md`, content: buildCanvasMarkdownFromPlanning },
  };
  const builder = builders[exportType];
  const content = builder.content({ project, repo, planning, generatedAt });

  return {
    exportType,
    format: builder.format,
    filename: builder.filename,
    mimeType: builder.format === "mermaid" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8",
    generatedAt,
    content,
  };
};
