import type { GitHubRepoSnapshot, OpsConsoleData, Project } from "@/lib/ops/types";
import {
  analyzeRepoStructure as analyzeRepoStructureContract,
  applyReadableCanvasLayout as applyReadableCanvasLayoutContract,
  buildCanvasModel as buildCanvasModelContract,
  buildCanvasNodes as buildCanvasNodesContract,
  buildCanvasMarkdown as buildCanvasMarkdownContract,
  buildProjectCanvasResponse as buildProjectCanvasResponseContract,
  canvasEdges as canvasEdgesContract,
  createProjectFromRepo as createProjectFromRepoContract,
  findProjectByProjectId as findProjectByProjectIdContract,
  findProjectByRepo as findProjectByRepoContract,
  findRepoByProjectId as findRepoByProjectIdContract,
  getAvailableGitHubRepos as getAvailableGitHubReposContract,
  getManagedRepos as getManagedReposContract,
  getRepoStatus as getRepoStatusContract,
  sanitizeCanvasPayload as sanitizeCanvasPayloadContract,
  toProjectId as toProjectIdContract,
} from "@/lib/ops/project-management-contract.mjs";
import {
  buildArchitectureModelFromRepoAnalysis as buildArchitectureModelFromRepoAnalysisContract,
  buildManyfastStyleIaFromRoutes as buildManyfastStyleIaFromRoutesContract,
  buildPlanningDocumentFromRepoAnalysis as buildPlanningDocumentFromRepoAnalysisContract,
} from "@/lib/ops/project-planning-contract.mjs";

export type ProjectCanvasNodeType =
  | "repo"
  | "route"
  | "screen"
  | "action"
  | "page"
  | "feature"
  | "component"
  | "api"
  | "service"
  | "database"
  | "storage"
  | "integration"
  | "job"
  | "security"
  | "deploy"
  | "deployment"
  | "docs"
  | "artifact"
  | "agent"
  | "start"
  | "decision"
  | "export";

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
  confidence?: number;
  evidence?: string[];
};

export type ProjectCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  relation?: string;
};

export type RepoAnalysisResult = {
  summary: {
    files: number;
    routes: number;
    layouts: number;
    apiRoutes: number;
    components: number;
    services: number;
    storages: number;
    jobs: number;
    docs: number;
    config: number;
    authFiles: number;
    filesWithContent?: number;
    imports?: number;
    apiCalls?: number;
    docHeadings?: number;
  };
  files: string[];
  contentSignals?: {
    componentImports: Array<{ file: string; importPath: string }>;
    serviceImports: Array<{ file: string; importPath: string }>;
    apiImports: Array<{ file: string; importPath: string }>;
    docHeadings: string[];
  };
  nodes: ProjectCanvasNode[];
  edges: ProjectCanvasEdge[];
};

export type PlanningStatus = "todo" | "doing" | "done" | "blocked";
export type PlanningPriority = "low" | "medium" | "high";

export type UserRole = {
  id: string;
  name: string;
  description: string;
};

export type PRDDocument = {
  overview: string;
  goals: string[];
  targetUsers: UserRole[];
  coreValues: string[];
  scenarios: string[];
  successMetrics: string[];
  risks: string[];
  openQuestions: string[];
};

export type Requirement = {
  id: string;
  title: string;
  description: string;
  priority: PlanningPriority;
  status: PlanningStatus;
};

export type Feature = {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  userRoleIds: string[];
  status: PlanningStatus;
};

export type Specification = {
  id: string;
  featureId: string;
  title: string;
  behavior: string;
  acceptanceCriteria: string[];
  edgeCases: string[];
  linkedPageIds: string[];
  linkedApiIds: string[];
  evidenceIds: string[];
};

export type IAPage = {
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
};

export type UserFlowStep = {
  id: string;
  pageId?: string;
  action: string;
  systemResponse: string;
  nextStepIds: string[];
  linkedSpecificationIds: string[];
};

export type UserFlow = {
  id: string;
  title: string;
  actorRoleId?: string;
  steps: UserFlowStep[];
};

export type WireframeBlock = {
  id: string;
  pageId: string;
  sectionName: string;
  layoutType: "hero" | "list" | "form" | "table" | "kanban" | "canvas" | "modal" | "sidebar" | "chart" | "custom";
  contentPurpose: string;
  linkedSpecificationIds: string[];
  evidenceIds: string[];
  order: number;
};

export type ArchitectureNode = {
  id: string;
  projectId: string;
  kind: "frontend" | "api" | "service" | "database" | "storage" | "job" | "integration" | "auth" | "deploy" | "agent";
  label: string;
  description: string;
  codeRefs: string[];
  apiLinks: string[];
  evidenceIds: string[];
  confidence?: number;
  source?: "github-analysis" | "user-created" | "ai-suggestion";
};

export type GitHubEvidence = {
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
};

export type ProjectPlanningDocument = {
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
  canvas: {
    nodes: ProjectCanvasNode[];
    edges: ProjectCanvasEdge[];
    summary?: RepoAnalysisResult["summary"] | Record<string, number>;
  };
  agentTasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string;
    linkedSpecificationIds: string[];
    linkedArchitectureIds: string[];
    status: PlanningStatus;
  }>;
  evidence: GitHubEvidence[];
  updatedAt: string;
};

export type ManagedRepo = {
  repo: GitHubRepoSnapshot;
  project?: Project;
  deployUrl?: string;
};

export type AvailableGitHubRepo = GitHubRepoSnapshot & {
  managed: boolean;
  project?: Project;
};

export const toProjectId = toProjectIdContract as (repo: GitHubRepoSnapshot) => string;

export const createProjectFromRepo = createProjectFromRepoContract as (
  repo: GitHubRepoSnapshot,
  options?: { now?: string },
) => Project;

export const getManagedRepos = getManagedReposContract as (
  data: Pick<OpsConsoleData, "projects" | "github">,
) => ManagedRepo[];

export const getAvailableGitHubRepos = getAvailableGitHubReposContract as (
  data: Pick<OpsConsoleData, "projects" | "github">,
) => AvailableGitHubRepo[];

export const findRepoByProjectId = findRepoByProjectIdContract as (
  data: Pick<OpsConsoleData, "projects" | "github">,
  projectId: string,
) => GitHubRepoSnapshot | undefined;

export const findProjectByProjectId = findProjectByProjectIdContract as (
  data: Pick<OpsConsoleData, "projects">,
  projectId: string,
) => Project | undefined;

export const findProjectByRepo = findProjectByRepoContract as (
  data: Pick<OpsConsoleData, "projects">,
  repo?: GitHubRepoSnapshot,
) => Project | undefined;

export const getRepoStatus = getRepoStatusContract as (
  repo: GitHubRepoSnapshot,
  deployUrl?: string,
) => {
  deployStatus: "healthy" | "warning" | "risk" | "unknown";
  securityStatus: "healthy" | "warning" | "risk" | "unknown";
  updatedAt: string;
  deployUrl?: string;
};

export const canvasEdges = canvasEdgesContract as ProjectCanvasEdge[];

export const analyzeRepoStructure = analyzeRepoStructureContract as (
  input: { files: string[]; fileContents?: Record<string, string>; contents?: Record<string, string> } | string[],
) => RepoAnalysisResult;

export const buildCanvasModel = buildCanvasModelContract as (
  repo?: GitHubRepoSnapshot,
  deployUrl?: string,
  project?: Project,
  analysis?: RepoAnalysisResult | null,
) => {
  nodes: ProjectCanvasNode[];
  edges: ProjectCanvasEdge[];
  summary?: RepoAnalysisResult["summary"];
};

export const applyReadableCanvasLayout = applyReadableCanvasLayoutContract as (
  nodes: ProjectCanvasNode[],
) => ProjectCanvasNode[];

export const buildProjectCanvasResponse = buildProjectCanvasResponseContract as (
  data: Pick<OpsConsoleData, "projects" | "github">,
  projectId: string,
  analysis?: RepoAnalysisResult | null,
) => {
  projectId: string;
  project?: Project;
  repo?: GitHubRepoSnapshot;
  source: "repo-analysis" | "static-template";
  canvas: {
    nodes: ProjectCanvasNode[];
    edges: ProjectCanvasEdge[];
    summary?: RepoAnalysisResult["summary"];
  };
} | null;

export const buildCanvasNodes = buildCanvasNodesContract as (
  repo?: GitHubRepoSnapshot,
  deployUrl?: string,
  project?: Project,
  analysis?: RepoAnalysisResult | null,
) => ProjectCanvasNode[];

export const buildCanvasMarkdown = buildCanvasMarkdownContract as (input: {
  project?: Project;
  repo?: GitHubRepoSnapshot;
  canvas: {
    nodes: ProjectCanvasNode[];
    edges: ProjectCanvasEdge[];
  };
  generatedAt?: string;
}) => string;

export const sanitizeCanvasPayload = sanitizeCanvasPayloadContract as (
  input: unknown,
) => {
  nodes: ProjectCanvasNode[];
  edges: ProjectCanvasEdge[];
  summary?: RepoAnalysisResult["summary"];
};

export const buildManyfastStyleIaFromRoutes = buildManyfastStyleIaFromRoutesContract as (input: {
  project?: Project;
  repo?: GitHubRepoSnapshot;
  analysis?: RepoAnalysisResult | null;
  evidence?: GitHubEvidence[];
}) => IAPage[];

export const buildArchitectureModelFromRepoAnalysis = buildArchitectureModelFromRepoAnalysisContract as (input: {
  project?: Project;
  repo?: GitHubRepoSnapshot;
  analysis?: RepoAnalysisResult | null;
  evidence?: GitHubEvidence[];
}) => ArchitectureNode[];

export const buildPlanningDocumentFromRepoAnalysis = buildPlanningDocumentFromRepoAnalysisContract as (input: {
  project?: Project;
  repo?: GitHubRepoSnapshot;
  analysis?: RepoAnalysisResult | null;
  now?: string;
}) => ProjectPlanningDocument;
