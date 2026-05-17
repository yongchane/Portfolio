"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { InfoTile } from "@/components/ops/shared";
import type { OpsConsoleData } from "@/lib/ops/types";
import {
  applyReadableCanvasLayout,
  buildCanvasModel,
  findProjectByProjectId,
  findProjectByRepo,
  findRepoByProjectId,
  type ProjectPlanningDocument,
  type ProjectCanvasEdge,
  type ProjectCanvasNode,
  type ProjectCanvasNodeShape,
  type ProjectCanvasNodeType,
  type RepoAnalysisResult,
} from "@/components/ops/project-management/mock-data";
import { getCanvasControlBarState } from "@/components/ops/project-management/canvas-control-bar.mjs";

const CANVAS_WIDTH = 5200;
const CANVAS_HEIGHT = 3600;

type CanvasModuleKey = "ia" | "specifications" | "userFlows" | "wireframes" | "architecture" | "evidence" | "agentTasks" | "export" | "deploy";
type CanvasApiPayload = {
  ok?: boolean;
  source?: string;
  savedAt?: string;
  canvas?: {
    nodes?: ProjectCanvasNode[];
    edges?: ProjectCanvasEdge[];
    summary?: RepoAnalysisResult["summary"];
  };
};
type PlanningApiPayload = {
  ok?: boolean;
  source?: string;
  savedAt?: string;
  planning?: ProjectPlanningDocument;
  message?: string;
};
type PlanningGenerateApiPayload = PlanningApiPayload & {
  canvas?: {
    nodes?: ProjectCanvasNode[];
    edges?: ProjectCanvasEdge[];
    summary?: RepoAnalysisResult["summary"];
  };
};
type AiSuggestion = {
  id: string;
  projectId: string;
  targetType: "prd" | "requirement" | "feature" | "specification" | "ia-page" | "user-flow" | "wireframe" | "architecture" | "canvas" | "agent-task";
  action: "create" | "update" | "delete" | "link";
  proposedValue: Record<string, unknown>;
  rationale: string;
  evidenceIds: string[];
  status: "pending" | "approved" | "rejected";
  createdBy: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
};
type SuggestionApiPayload = {
  ok?: boolean;
  suggestions?: AiSuggestion[];
  suggestion?: AiSuggestion;
  planning?: ProjectPlanningDocument;
  message?: string;
};
type PlanningExportType = "prd" | "specifications" | "ia" | "user-flow" | "architecture" | "agent-brief" | "canvas";
type PlanningExportPayload = {
  ok?: boolean;
  exportType?: PlanningExportType;
  filename?: string;
  content?: string;
  mimeType?: string;
  message?: string;
};

const planningExportActions: Array<{ type: PlanningExportType; label: string }> = [
  { type: "prd", label: "PRD" },
  { type: "specifications", label: "Spec" },
  { type: "ia", label: "IA" },
  { type: "user-flow", label: "Flow" },
  { type: "architecture", label: "Arch" },
  { type: "agent-brief", label: "Agent Brief" },
  { type: "canvas", label: "Canvas MD" },
];

const editableNodeTypes: ProjectCanvasNodeType[] = [
  "page",
  "feature",
  "route",
  "screen",
  "action",
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
  "repo",
];

const editableNodeShapes: ProjectCanvasNodeShape[] = ["rect", "note", "circle", "diamond"];

const createEmptyNodeDraft = () => ({
  type: "feature" as ProjectCanvasNodeType,
  shape: "rect" as ProjectCanvasNodeShape,
  icon: "✨",
  label: "새 기능 노드",
  description: "이 노드가 담당하는 페이지/기능/시스템 역할을 적어주세요.",
  codeRefs: "components/example.tsx",
  interactions: "사용자가 버튼을 클릭한다\n상태가 변경된다",
  apiLinks: "future: GET /api/example",
  meta: "custom, draft",
});

const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
const splitTags = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const stopCanvasWheel = (event: React.WheelEvent<HTMLElement>) => event.stopPropagation();
const confidenceLabel = (value?: number) => {
  if (typeof value !== "number") return "manual";
  if (value >= 0.9) return "high";
  if (value >= 0.75) return "medium";
  return "low";
};

const canvasModules: Array<{
  key: CanvasModuleKey;
  title: string;
  desc: string;
  pan: { x: number; y: number };
  zoom: number;
}> = [
  {
    key: "ia",
    title: "IA Tree",
    desc: "Manyfast식 페이지 계층",
    pan: { x: 120, y: 90 },
    zoom: 1,
  },
  {
    key: "specifications",
    title: "Spec Directory",
    desc: "Requirement → Feature → Spec",
    pan: { x: 110, y: 60 },
    zoom: 0.92,
  },
  {
    key: "userFlows",
    title: "User Flow",
    desc: "사용자 여정과 화면 연결",
    pan: { x: 120, y: 90 },
    zoom: 0.96,
  },
  {
    key: "wireframes",
    title: "Wireframe Blocks",
    desc: "페이지별 섹션/블록",
    pan: { x: 120, y: 90 },
    zoom: 0.96,
  },
  {
    key: "architecture",
    title: "System Architecture",
    desc: "GitHub/API/DB/Deploy 연결",
    pan: { x: 80, y: -970 },
    zoom: 0.9,
  },
  {
    key: "evidence",
    title: "GitHub Evidence",
    desc: "코드 근거와 신뢰도",
    pan: { x: 80, y: -970 },
    zoom: 0.82,
  },
  {
    key: "agentTasks",
    title: "Agent Tasks",
    desc: "AI 작업 후보와 승인 흐름",
    pan: { x: 90, y: -1910 },
    zoom: 0.9,
  },
  {
    key: "export",
    title: "Export / AI Review",
    desc: "명세/이미지 출력과 AI 검토",
    pan: { x: 90, y: -1910 },
    zoom: 0.9,
  },
  {
    key: "deploy",
    title: "Deploy Health",
    desc: "배포 URL과 운영 상태",
    pan: { x: 90, y: -560 },
    zoom: 1.05,
  },
];

const nodeTone: Record<ProjectCanvasNodeType, string> = {
  repo: "border-slate-200/30 bg-slate-300/10 text-slate-50",
  route: "border-cyan-300/45 bg-cyan-400/10 text-cyan-50",
  screen: "border-cyan-200/40 bg-cyan-300/10 text-cyan-50",
  action: "border-yellow-300/45 bg-yellow-400/10 text-yellow-50",
  page: "border-cyan-300/40 bg-cyan-400/10 text-cyan-50",
  feature: "border-amber-300/40 bg-amber-400/10 text-amber-50",
  component: "border-teal-300/40 bg-teal-400/10 text-teal-50",
  api: "border-violet-300/40 bg-violet-400/10 text-violet-50",
  service: "border-indigo-300/40 bg-indigo-400/10 text-indigo-50",
  database: "border-emerald-300/40 bg-emerald-400/10 text-emerald-50",
  storage: "border-emerald-300/45 bg-emerald-400/10 text-emerald-50",
  integration: "border-sky-300/40 bg-sky-400/10 text-sky-50",
  job: "border-orange-300/40 bg-orange-400/10 text-orange-50",
  security: "border-red-300/40 bg-red-400/10 text-red-50",
  deploy: "border-sky-300/40 bg-sky-400/10 text-sky-50",
  deployment: "border-blue-300/40 bg-blue-400/10 text-blue-50",
  docs: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-50",
  artifact: "border-lime-300/40 bg-lime-400/10 text-lime-50",
  agent: "border-rose-300/40 bg-rose-400/10 text-rose-50",
  start: "border-white/35 bg-white/10 text-white",
  decision: "border-orange-300/50 bg-orange-400/10 text-orange-50",
  export: "border-lime-300/45 bg-lime-400/10 text-lime-50",
};

const nodeLabel: Record<ProjectCanvasNodeType, string> = {
  repo: "Repo",
  route: "Route",
  screen: "Screen",
  action: "Action",
  page: "Page",
  feature: "Feature",
  component: "Component",
  api: "API",
  service: "Service",
  database: "DB",
  storage: "Storage",
  integration: "Integration",
  job: "Job",
  security: "Security",
  deploy: "Deploy",
  deployment: "Deploy",
  docs: "Docs",
  artifact: "Artifact",
  agent: "AI",
  start: "Start",
  decision: "Decision",
  export: "Export",
};

const getNodeSize = (shape: ProjectCanvasNodeShape) => {
  if (shape === "circle")
    return { width: 92, height: 92, anchorX: 46, anchorY: 46 };
  if (shape === "diamond")
    return { width: 122, height: 122, anchorX: 61, anchorY: 61 };
  if (shape === "note")
    return { width: 190, height: 104, anchorX: 95, anchorY: 52 };
  return { width: 188, height: 96, anchorX: 94, anchorY: 48 };
};

const CanvasSectionLabel = ({
  title,
  subtitle,
  x,
  y,
}: {
  title: string;
  subtitle: string;
  x: number;
  y: number;
}) => (
  <div
    className="absolute rounded-[2rem] border border-white/10 bg-black/40 px-5 py-4 shadow-2xl backdrop-blur"
    style={{ left: x, top: y }}
  >
    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
      canvas section
    </p>
    <h4 className="mt-1 text-2xl font-black text-white">{title}</h4>
    <p className="mt-1 text-xs text-white/55">{subtitle}</p>
  </div>
);

const CanvasEdgeLayer = ({ nodes, edges }: { nodes: ProjectCanvasNode[]; edges: ProjectCanvasEdge[] }) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    >
      <defs>
        <marker
          id="flow-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.48)" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;

        const sourceSize = getNodeSize(source.shape);
        const targetSize = getNodeSize(target.shape);
        const x1 = source.x + sourceSize.anchorX;
        const y1 = source.y + sourceSize.anchorY;
        const x2 = target.x + targetSize.anchorX;
        const y2 = target.y + targetSize.anchorY;
        const midX = (x1 + x2) / 2;

        return (
          <g key={edge.id}>
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(255,255,255,0.32)"
              strokeWidth="2"
              markerEnd="url(#flow-arrow)"
            />
            <text
              x={midX}
              y={(y1 + y2) / 2 - 8}
              textAnchor="middle"
              className="fill-white/55 text-[10px]"
            >
              {edge.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const CanvasNodeCard = ({
  node,
  selected,
  dragging,
  onPointerDown,
  onClick,
}: {
  node: ProjectCanvasNode;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) => {
  const size = getNodeSize(node.shape);
  const isDiamond = node.shape === "diamond";

  return (
    <button
      data-canvas-node="true"
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{
        left: node.x,
        top: node.y,
        width: size.width,
        height: size.height,
      }}
      className={clsx(
        "absolute select-none border p-3 text-left shadow-xl backdrop-blur transition focus:outline-none",
        node.shape === "circle"
          ? "rounded-full text-center"
          : node.shape === "note"
            ? "rounded-[1.25rem] border-dashed"
            : "rounded-2xl",
        isDiamond && "rotate-45 rounded-2xl",
        nodeTone[node.type],
        selected && "ring-2 ring-white/60",
        dragging
          ? "cursor-grabbing scale-[1.02]"
          : "cursor-grab hover:-translate-y-0.5",
      )}
    >
      <div className={clsx("h-full", isDiamond && "-rotate-45 scale-[0.78]")}>
        <div
          className={clsx(
            "mb-1 flex items-center gap-2",
            node.shape === "circle" && "justify-center",
          )}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-black/25 text-sm">
            {node.icon}
          </span>
          {node.shape !== "circle" && (
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[9px] opacity-70">
              {nodeLabel[node.type]}
            </span>
          )}
        </div>
        <strong className="block text-xs leading-4">{node.label}</strong>
        {node.shape !== "circle" && (
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 opacity-70">
            {node.description}
          </p>
        )}
      </div>
    </button>
  );
};

const EvidenceList = ({ label, items }: { label: string; items: string[] }) => (
  <div>
    <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</p>
    {items.length ? (
      <ul className="space-y-1">
        {items.slice(0, 5).map((item) => (
          <li key={item} className="break-all rounded-lg bg-black/25 px-2 py-1 text-[11px] leading-4 text-white/70">
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-lg bg-black/20 px-2 py-1 text-[11px] text-white/35">No signal</p>
    )}
  </div>
);

const getModeNodeIds = (mode: CanvasModuleKey, nodes: ProjectCanvasNode[]) => {
  const byIdOrType = (ids: string[], types: ProjectCanvasNodeType[]) =>
    new Set(nodes.filter((node) => ids.includes(node.id) || types.includes(node.type)).map((node) => node.id));

  switch (mode) {
    case "ia":
    case "userFlows":
    case "wireframes":
      return byIdOrType(["entry", "repo", "canvas-editor"], ["route", "page", "feature", "screen", "action"]);
    case "specifications":
      return byIdOrType(["repo", "canvas-editor", "ops-api", "data-loader"], ["route", "page", "feature", "api", "service"]);
    case "architecture":
      return byIdOrType(["repo", "ops-api", "data-loader", "database", "deploy"], ["component", "api", "service", "storage", "database", "job", "security", "deployment", "deploy", "integration"]);
    case "evidence":
      return byIdOrType(["repo"], ["docs", "artifact", "component", "api", "service", "security", "deployment", "deploy", "storage", "database", "job"]);
    case "agentTasks":
    case "export":
      return byIdOrType(["canvas-editor", "export-feature", "docs", "agent"], ["export", "agent", "docs", "artifact"]);
    case "deploy":
      return byIdOrType(["repo", "deploy", "analysis-deployment", "database"], ["deployment", "deploy", "storage", "database", "job"]);
  }
};

const ModeDetailPanel = ({
  mode,
  planning,
  source,
}: {
  mode: CanvasModuleKey;
  planning?: ProjectPlanningDocument;
  source?: string;
}) => {
  const rows = (() => {
    if (!planning) return ["Planning API 응답 대기 중이거나 Nest proxy env가 필요합니다."];
    if (mode === "ia") return planning.iaPages.slice(0, 10).map((page) => `${"  ".repeat(Math.max(0, page.depth - 1))}${page.title}${page.route ? ` · ${page.route}` : ""}`);
    if (mode === "specifications") return [
      `Requirements ${planning.requirements.length}`,
      `Features ${planning.features.length}`,
      ...planning.specifications.slice(0, 8).map((spec) => spec.title),
    ];
    if (mode === "userFlows") return planning.userFlows.flatMap((flow) => [flow.title, ...flow.steps.slice(0, 6).map((step) => `→ ${step.action}`)]).slice(0, 10);
    if (mode === "wireframes") return planning.wireframes.slice(0, 10).map((block) => `${block.sectionName} · ${block.layoutType}`);
    if (mode === "architecture") return planning.architecture.slice(0, 10).map((node) => `${node.kind} · ${node.label}`);
    if (mode === "evidence") return planning.evidence.slice(0, 10).map((item) => `${item.evidenceType} · ${item.path}`);
    if (mode === "agentTasks") return planning.agentTasks.slice(0, 10).map((task) => `${task.status} · ${task.title}`);
    return [
      `PRD goals ${planning.prd.goals.length}`,
      `Specs ${planning.specifications.length}`,
      `Evidence ${planning.evidence.length}`,
      "Markdown/PNG/agent brief export 대상",
    ];
  })();

  return (
    <div className="absolute left-80 top-4 z-20 w-[28rem] rounded-[1.4rem] border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl" data-canvas-control="true" onWheel={stopCanvasWheel}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">mode detail</p>
          <h3 className="mt-1 text-lg font-black text-white">{canvasModules.find((item) => item.key === mode)?.title}</h3>
        </div>
        <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-50">{source || "planning"}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-[11px]">
        <InfoTile label="IA" value={String(planning?.iaPages.length ?? "-")} />
        <InfoTile label="Specs" value={String(planning?.specifications.length ?? "-")} />
        <InfoTile label="Arch" value={String(planning?.architecture.length ?? "-")} />
        <InfoTile label="Evidence" value={String(planning?.evidence.length ?? "-")} />
      </div>
      <ul className="mt-3 max-h-56 space-y-1 overflow-auto pr-1">
        {rows.map((row, index) => (
          <li key={`${row}-${index}`} className="rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5 text-[11px] leading-4 text-white/70">
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
};

function downloadTextFile(filename: string, content: string, type = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectCanvasPage({
  data,
  projectId,
  repoAnalysis,
}: {
  data: OpsConsoleData;
  projectId: string;
  repoAnalysis?: RepoAnalysisResult | null;
}) {
  const repo = findRepoByProjectId(data, projectId);
  const project = findProjectByProjectId(data, projectId) || findProjectByRepo(data, repo);
  const initialModel = useMemo(
    () => buildCanvasModel(repo, project?.deployUrl, project, repoAnalysis),
    [repo, project, repoAnalysis],
  );
  const initialNodes = initialModel.nodes;
  const [nodes, setNodes] = useState<ProjectCanvasNode[]>(initialNodes);
  const [edges, setEdges] = useState<ProjectCanvasEdge[]>(initialModel.edges);
  const [selectedNodeId, setSelectedNodeId] = useState("entry");
  const [dragState, setDragState] = useState<{
    nodeId: string;
    startX: number;
    startY: number;
    nodeX: number;
    nodeY: number;
  } | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [pan, setPan] = useState({ x: 120, y: 90 });
  const [zoom, setZoom] = useState(1);
  const [modulesOpen, setModulesOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [activeModule, setActiveModule] = useState<CanvasModuleKey>("ia");
  const [nodeCreatorOpen, setNodeCreatorOpen] = useState(false);
  const [nodeDraft, setNodeDraft] = useState(createEmptyNodeDraft);
  const [apiStatus, setApiStatus] = useState("Loading canvas API...");
  const [planning, setPlanning] = useState<ProjectPlanningDocument | undefined>();
  const [planningSource, setPlanningSource] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState("AI suggestions not loaded");
  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) || nodes[0];
  const visibleNodeIds = useMemo(() => {
    const ids = getModeNodeIds(activeModule, nodes);
    return ids.size ? ids : new Set(nodes.map((node) => node.id));
  }, [activeModule, nodes]);
  const visibleNodes = useMemo(
    () => nodes.filter((node) => visibleNodeIds.has(node.id)),
    [nodes, visibleNodeIds],
  );
  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds],
  );
  const pendingSuggestions = useMemo(
    () => suggestions.filter((item) => item.status === "pending"),
    [suggestions],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateCanvas() {
      setApiStatus("Loading canvas API...");
      try {
        const response = await fetch(`/api/ops/projects/${projectId}/canvas`, {
          signal: controller.signal,
        });
        const result = (await response.json().catch(() => null)) as CanvasApiPayload | null;
        if (!response.ok || !result?.canvas?.nodes?.length) {
          throw new Error("Canvas API returned no nodes.");
        }

        const readableNodes = applyReadableCanvasLayout(result.canvas.nodes);
        setNodes(readableNodes);
        setEdges(result.canvas.edges || []);
        setSelectedNodeId(readableNodes[0]?.id || "entry");
        setApiStatus(`${result.source || "api"} loaded${result.savedAt ? ` · saved ${result.savedAt}` : ""}`);
      } catch (error) {
        if (controller.signal.aborted) return;
        setNodes(initialNodes);
        setEdges(initialModel.edges);
        setSelectedNodeId("entry");
        setApiStatus(error instanceof Error ? `Fallback: ${error.message}` : "Fallback canvas loaded");
      }
      setPan({ x: 120, y: 90 });
      setZoom(1);
    }

    void hydrateCanvas();
    return () => controller.abort();
  }, [projectId, initialNodes, initialModel.edges]);

  useEffect(() => {
    const controller = new AbortController();

    async function hydratePlanning() {
      try {
        const response = await fetch(`/api/ops/projects/${projectId}/planning`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as PlanningApiPayload | null;
        if (!response.ok || !result?.planning) return;
        setPlanning(result.planning);
        setPlanningSource(result.source || "planning-api");
      } catch {
        if (!controller.signal.aborted) setPlanningSource("planning unavailable");
      }
    }

    void hydratePlanning();
    return () => controller.abort();
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateSuggestions() {
      try {
        const response = await fetch(`/api/ops/projects/${projectId}/suggestions`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as SuggestionApiPayload | null;
        if (!response.ok || !result?.suggestions) {
          setSuggestionStatus(result?.message || "AI suggestions API unavailable");
          return;
        }
        setSuggestions(result.suggestions);
        setSuggestionStatus(`${result.suggestions.filter((item) => item.status === "pending").length} pending suggestions`);
      } catch {
        if (!controller.signal.aborted) setSuggestionStatus("AI suggestions unavailable");
      }
    }

    void hydrateSuggestions();
    return () => controller.abort();
  }, [projectId]);

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.max(0.35, Math.min(1.8, Number(nextZoom.toFixed(2)))));
  };

  const focusModule = (moduleKey: CanvasModuleKey) => {
    const targetModule = canvasModules.find(
      (module) => module.key === moduleKey,
    );
    if (!targetModule) return;
    setActiveModule(moduleKey);
    setPan(targetModule.pan);
    setZoom(targetModule.zoom);
  };

  const resetView = () => focusModule("ia");

  const autoLayoutCanvas = () => {
    setNodes((current) => applyReadableCanvasLayout(current));
    setApiStatus("readable lane layout applied · save to persist");
  };

  const generatePlanningFromGitHub = async () => {
    setApiStatus("Generating planning from GitHub...");
    const response = await fetch(`/api/ops/projects/${projectId}/planning/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const result = (await response.json().catch(() => null)) as PlanningGenerateApiPayload | null;
    if (!response.ok || !result?.planning) {
      setApiStatus(result?.message || "Planning generate failed");
      return;
    }

    setPlanning(result.planning);
    setPlanningSource(result.source || "generated-planning");
    const nextCanvas = result.canvas || result.planning.canvas;
    if (nextCanvas?.nodes?.length) {
      const readableNodes = applyReadableCanvasLayout(nextCanvas.nodes);
      setNodes(readableNodes);
      setEdges(nextCanvas.edges || []);
      setSelectedNodeId(readableNodes[0]?.id || "planning-root");
    }
    setApiStatus(`generated-planning · ${result.savedAt || "saved to backend"}`);
  };

  const generateAiSuggestions = async () => {
    setSuggestionStatus("Generating AI suggestions...");
    const response = await fetch(`/api/ops/projects/${projectId}/suggestions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const result = (await response.json().catch(() => null)) as SuggestionApiPayload | null;
    if (!response.ok || !result?.suggestions) {
      setSuggestionStatus(result?.message || "AI suggestions generate failed");
      return;
    }
    const nextSuggestions = [...result.suggestions, ...suggestions]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
    setSuggestions(nextSuggestions);
    setSuggestionStatus(`${result.suggestions.length} new suggestions generated`);
  };

  const decideSuggestion = async (suggestionId: string, decision: "approve" | "reject") => {
    setSuggestionStatus(`${decision} suggestion...`);
    const response = await fetch(`/api/ops/projects/${projectId}/suggestions/${suggestionId}/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const result = (await response.json().catch(() => null)) as SuggestionApiPayload | null;
    if (!response.ok || !result?.suggestion) {
      setSuggestionStatus(result?.message || `Suggestion ${decision} failed`);
      return;
    }

    setSuggestions((current) => current.map((item) => item.id === suggestionId ? result.suggestion as AiSuggestion : item));
    if (result.planning) {
      setPlanning(result.planning);
      setPlanningSource("suggestion-approved");
    }
    setSuggestionStatus(`${result.suggestion.status} · ${result.suggestion.targetType}`);
  };

  const updateSelectedNode = (patch: Partial<ProjectCanvasNode>) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id ? { ...node, ...patch } : node,
      ),
    );
  };

  const addNode = () => {
    const id = `custom-${Date.now()}`;
    const newNode: ProjectCanvasNode = {
      id,
      type: nodeDraft.type,
      shape: nodeDraft.shape,
      icon: nodeDraft.icon || "✨",
      label: nodeDraft.label || "새 노드",
      description: nodeDraft.description || "설명을 입력해 주세요.",
      x: Math.max(80, Math.min(CANVAS_WIDTH - 240, (window.innerWidth / 2 - pan.x) / zoom)),
      y: Math.max(80, Math.min(CANVAS_HEIGHT - 180, (window.innerHeight / 2 - pan.y) / zoom)),
      source: "user-created",
      meta: splitTags(nodeDraft.meta),
      codeRefs: splitLines(nodeDraft.codeRefs),
      interactions: splitLines(nodeDraft.interactions),
      apiLinks: splitLines(nodeDraft.apiLinks),
    };
    setNodes((current) => [...current, newNode]);
    setSelectedNodeId(id);
    setInspectorOpen(true);
    setNodeCreatorOpen(false);
    setNodeDraft(createEmptyNodeDraft());
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const remainingNodes = nodes.filter((node) => node.id !== selectedNode.id);
    if (!remainingNodes.length) return;
    setNodes(remainingNodes);
    setSelectedNodeId(remainingNodes[0].id);
  };

  const saveCanvas = async () => {
    setApiStatus("Saving canvas...");
    const response = await fetch(`/api/ops/projects/${projectId}/canvas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvas: { nodes, edges } }),
    });
    const result = (await response.json().catch(() => null)) as CanvasApiPayload | { message?: string } | null;
    if (!response.ok || !result || !("canvas" in result) || !result.canvas?.nodes?.length) {
      setApiStatus(result && "message" in result && result.message ? result.message : "Canvas save failed");
      return;
    }

    setNodes(applyReadableCanvasLayout(result.canvas.nodes));
    setEdges(result.canvas.edges || []);
    setApiStatus(`saved-canvas · ${"savedAt" in result && result.savedAt ? result.savedAt : "saved"}`);
  };

  const exportMarkdown = async () => {
    setApiStatus("Exporting markdown...");
    const response = await fetch(`/api/ops/projects/${projectId}/canvas/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvas: { nodes, edges } }),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; filename?: string; markdown?: string; message?: string } | null;
    if (!response.ok || !result?.markdown) {
      setApiStatus(result?.message || "Markdown export failed");
      return;
    }

    downloadTextFile(result.filename || `${projectId}-canvas.md`, result.markdown);
    setApiStatus("markdown exported");
  };

  const exportPlanningArtifact = async (exportType: PlanningExportType) => {
    setApiStatus(`Exporting ${exportType}...`);
    const response = await fetch(`/api/ops/projects/${projectId}/export/${exportType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const result = (await response.json().catch(() => null)) as PlanningExportPayload | null;
    if (!response.ok || !result?.content) {
      setApiStatus(result?.message || `${exportType} export failed`);
      return;
    }

    downloadTextFile(
      result.filename || `${projectId}-${exportType}.md`,
      result.content,
      result.mimeType || "text/markdown;charset=utf-8",
    );
    setApiStatus(`${exportType} exported`);
  };

  const exportPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1200;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#07111f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(255,255,255,0.18)";
    for (let x = 0; x < canvas.width; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    const scale = 0.45;
    const offsetX = 80;
    const offsetY = 80;
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    context.font = "14px sans-serif";
    context.lineWidth = 2;
    edges.forEach((item) => {
      const source = nodeMap.get(item.source);
      const target = nodeMap.get(item.target);
      if (!source || !target) return;
      context.strokeStyle = "rgba(255,255,255,0.42)";
      context.beginPath();
      context.moveTo(offsetX + source.x * scale + 70, offsetY + source.y * scale + 36);
      context.lineTo(offsetX + target.x * scale + 70, offsetY + target.y * scale + 36);
      context.stroke();
    });
    nodes.forEach((node) => {
      const x = offsetX + node.x * scale;
      const y = offsetY + node.y * scale;
      context.fillStyle = "#102033";
      context.strokeStyle = "#67e8f9";
      context.fillRect(x, y, 150, 72);
      context.strokeRect(x, y, 150, 72);
      context.fillStyle = "#ffffff";
      context.fillText(node.label.slice(0, 22), x + 10, y + 26);
      context.fillStyle = "rgba(255,255,255,0.68)";
      context.fillText(node.type, x + 10, y + 50);
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${projectId}-canvas.png`;
    link.click();
    setApiStatus("png exported");
  };

  const beginNodeDrag = (
    node: ProjectCanvasNode,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedNodeId(node.id);
    setDragState({
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    });
  };

  const beginCanvasPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest("[data-canvas-node='true'], [data-canvas-control='true']")
    )
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  };

  const movePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState) {
      const dx = (event.clientX - dragState.startX) / zoom;
      const dy = (event.clientY - dragState.startY) / zoom;
      setNodes((current) =>
        current.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                x: Math.max(
                  20,
                  Math.min(CANVAS_WIDTH - 210, dragState.nodeX + dx),
                ),
                y: Math.max(
                  20,
                  Math.min(CANVAS_HEIGHT - 140, dragState.nodeY + dy),
                ),
              }
            : node,
        ),
      );
      return;
    }

    if (!panState) return;
    setPan({
      x: panState.panX + event.clientX - panState.startX,
      y: panState.panY + event.clientY - panState.startY,
    });
  };

  const endPointer = () => {
    setDragState(null);
    setPanState(null);
  };

  return (
    <div
      onPointerDown={beginCanvasPan}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={(event) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          changeZoom(zoom + (event.deltaY > 0 ? -0.08 : 0.08));
        } else {
          setPan((current) => ({
            x: current.x - event.deltaX,
            y: current.y - event.deltaY,
          }));
        }
      }}
      className={clsx(
        "relative h-screen select-none overflow-hidden bg-[#070b16] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] text-white [background-size:28px_28px]",
        panState ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_45%_82%,rgba(16,185,129,0.10),transparent_34%)]" />

      <div
        className="absolute inset-x-4 bottom-4 z-30 rounded-[1.4rem] border border-white/10 bg-black/45 p-3 shadow-2xl backdrop-blur-xl"
        data-canvas-control="true"
        onWheel={stopCanvasWheel}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
              Figma-style project detail canvas
            </p>
            <h1 className="text-lg font-black">
              {repo?.repo || "프로젝트 canvas"}
            </h1>
            <p className="mt-1 text-[11px] text-cyan-100/60">{apiStatus}</p>
            {controlsOpen && (
              <p className="mt-1 text-xs text-white/55">
                프로젝트 상세보기에서는 main 전체가 canvas입니다. 배경 드래그로
                이동, ctrl/cmd+wheel 또는 버튼으로 zoom.
              </p>
            )}
          </div>
          <button
            onClick={() => setControlsOpen((value) => !value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10"
          >
            {getCanvasControlBarState(controlsOpen).toggleLabel}
          </button>
        </div>
        {controlsOpen && (
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <Link
                href="/ops/projects"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
              >
                목록
              </Link>
              {repo?.url && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
                >
                  GitHub
                </a>
              )}
              <button
                onClick={() => setActionsOpen((value) => !value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
              >
                Actions
              </button>
              <button
                onClick={() => setInspectorOpen((value) => !value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
              >
                Inspector
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <button
                onClick={() => changeZoom(zoom - 0.1)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
              >
                −
              </button>
              <span className="rounded-xl bg-white/10 px-3 py-2">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => changeZoom(zoom + 0.1)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
              >
                ＋
              </button>
              <button
                onClick={resetView}
                className="rounded-xl bg-white px-3 py-2 font-bold text-black"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <aside
        className={clsx(
          "absolute left-4 top-4 z-30 rounded-[1.4rem] border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl transition-all duration-300",
          modulesOpen ? "w-72 p-3" : "w-12 p-2",
        )}
        data-canvas-control="true"
        onWheel={stopCanvasWheel}
      >
        <button
          type="button"
          onClick={() => setModulesOpen((value) => !value)}
          className="mb-3 grid h-9 w-full place-items-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10"
        >
          {modulesOpen ? "← Modules" : "→"}
        </button>
        {modulesOpen && (
          <div className="space-y-2">
            <p className="px-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
              Canvas modules
            </p>
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-5 text-white/55">
              버튼을 누르면 해당 canvas 섹션으로 이동합니다. 지금은 세로로
              배치된 큰 가상 보드 안에서 IA → Architecture → Export/Review
              순서로 탐색합니다.
            </p>
            {canvasModules.map((module) => (
              <button
                key={module.key}
                onClick={() => focusModule(module.key)}
                className={clsx(
                  "w-full rounded-xl border px-3 py-2 text-left text-xs transition",
                  activeModule === module.key
                    ? "border-cyan-200/50 bg-cyan-300/15 text-cyan-50"
                    : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10",
                )}
              >
                <span className="block font-semibold text-white/85">
                  {module.title}
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-white/45">
                  {module.desc}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {actionsOpen && (
        <div
          className="absolute left-4 right-4 top-4 z-20 flex flex-wrap justify-end gap-2"
          data-canvas-control="true"
          onWheel={stopCanvasWheel}
        >
          <button
            onClick={autoLayoutCanvas}
            className="rounded-xl border border-cyan-200/30 bg-cyan-300/15 px-3 py-2 text-xs font-semibold text-cyan-50 shadow-xl backdrop-blur transition hover:bg-cyan-300/25"
          >
            Auto layout
          </button>
          <button
            onClick={generatePlanningFromGitHub}
            className="rounded-xl border border-amber-200/30 bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-50 shadow-xl backdrop-blur transition hover:bg-amber-300/25"
          >
            Generate planning from GitHub
          </button>
          <button
            onClick={() => setNodeCreatorOpen((value) => !value)}
            className="rounded-xl border border-cyan-200/30 bg-cyan-300/15 px-3 py-2 text-xs font-semibold text-cyan-50 shadow-xl backdrop-blur transition hover:bg-cyan-300/25"
          >
            + Node 추가
          </button>
          <button
            onClick={deleteSelectedNode}
            className="rounded-xl border border-rose-200/30 bg-rose-300/15 px-3 py-2 text-xs font-semibold text-rose-50 shadow-xl backdrop-blur transition hover:bg-rose-300/25"
          >
            선택 노드 삭제
          </button>
          <button onClick={saveCanvas} className="rounded-xl border border-emerald-200/30 bg-emerald-300/15 px-3 py-2 text-xs font-semibold text-emerald-50 shadow-xl backdrop-blur transition hover:bg-emerald-300/25">
            Canvas 저장
          </button>
          {planningExportActions.map((action) => (
            <button
              key={action.type}
              onClick={() => void exportPlanningArtifact(action.type)}
              className="rounded-xl border border-lime-200/25 bg-lime-300/10 px-3 py-2 text-xs font-semibold text-lime-50 shadow-xl backdrop-blur transition hover:bg-lime-300/20"
            >
              {action.label} Export
            </button>
          ))}
          <button onClick={exportMarkdown} className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/75 shadow-xl backdrop-blur transition hover:bg-white/10">
            Legacy Canvas Export
          </button>
          <button onClick={exportPng} className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/75 shadow-xl backdrop-blur transition hover:bg-white/10">
            Canvas PNG 다운로드
          </button>
          <button onClick={generateAiSuggestions} className="rounded-xl border border-rose-200/30 bg-rose-300/15 px-3 py-2 text-xs font-semibold text-rose-50 shadow-xl backdrop-blur transition hover:bg-rose-300/25">
            AI 제안 생성
          </button>
        </div>
      )}

      <ModeDetailPanel mode={activeModule} planning={planning} source={planningSource} />

      {nodeCreatorOpen && (
        <div
          className="absolute left-4 top-24 z-40 w-80 rounded-[1.4rem] border border-cyan-200/20 bg-black/70 p-4 shadow-2xl backdrop-blur-xl"
          data-canvas-control="true"
          onWheel={stopCanvasWheel}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/45">Create node</p>
              <h3 className="text-base font-bold text-white">새 노드 추가</h3>
            </div>
            <button onClick={() => setNodeCreatorOpen(false)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/60 hover:bg-white/10">닫기</button>
          </div>
          <div className="space-y-3 text-xs text-white/70">
            <div className="grid grid-cols-[64px_1fr] items-center gap-2">
              <label>아이콘</label>
              <input value={nodeDraft.icon} onChange={(event) => setNodeDraft((draft) => ({ ...draft, icon: event.target.value }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            </div>
            <div className="grid grid-cols-[64px_1fr] items-center gap-2">
              <label>타입</label>
              <select value={nodeDraft.type} onChange={(event) => setNodeDraft((draft) => ({ ...draft, type: event.target.value as ProjectCanvasNodeType }))} className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-white outline-none focus:border-cyan-200/50">
                {editableNodeTypes.map((type) => <option key={type} value={type}>{nodeLabel[type]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-[64px_1fr] items-center gap-2">
              <label>모양</label>
              <select value={nodeDraft.shape} onChange={(event) => setNodeDraft((draft) => ({ ...draft, shape: event.target.value as ProjectCanvasNodeShape }))} className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-white outline-none focus:border-cyan-200/50">
                {editableNodeShapes.map((shape) => <option key={shape} value={shape}>{shape}</option>)}
              </select>
            </div>
            <input value={nodeDraft.label} onChange={(event) => setNodeDraft((draft) => ({ ...draft, label: event.target.value }))} placeholder="노드 제목" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            <textarea value={nodeDraft.description} onChange={(event) => setNodeDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="노드 설명" rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            <textarea value={nodeDraft.codeRefs} onChange={(event) => setNodeDraft((draft) => ({ ...draft, codeRefs: event.target.value }))} placeholder="관련 코드/GitHub refs, 줄바꿈 구분" rows={2} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            <textarea value={nodeDraft.interactions} onChange={(event) => setNodeDraft((draft) => ({ ...draft, interactions: event.target.value }))} placeholder="인터랙션, 줄바꿈 구분" rows={2} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            <textarea value={nodeDraft.apiLinks} onChange={(event) => setNodeDraft((draft) => ({ ...draft, apiLinks: event.target.value }))} placeholder="API/Data links, 줄바꿈 구분" rows={2} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            <input value={nodeDraft.meta} onChange={(event) => setNodeDraft((draft) => ({ ...draft, meta: event.target.value }))} placeholder="tags, comma separated" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-200/50" />
            <button onClick={addNode} className="w-full rounded-xl bg-white px-3 py-2 font-bold text-black transition hover:bg-cyan-100">현재 화면 중앙에 노드 추가</button>
          </div>
        </div>
      )}

      <div
        className="absolute"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="absolute left-[180px] top-[140px] h-[690px] w-[1660px] rounded-[3rem] border border-cyan-300/10 bg-cyan-300/[0.03]" />
        <div className="absolute left-[430px] top-[1040px] h-[620px] w-[1440px] rounded-[3rem] border border-violet-300/10 bg-violet-300/[0.03]" />
        <div className="absolute left-[430px] top-[2060px] h-[520px] w-[1120px] rounded-[3rem] border border-amber-300/10 bg-amber-300/[0.03]" />
        <CanvasSectionLabel
          title="페이지별 기능 IA"
          subtitle="Page와 Feature를 분리해서 사용자 흐름을 확인"
          x={190}
          y={120}
        />
        <CanvasSectionLabel
          title="System Architecture"
          subtitle="GitHub, Ops API, DB, Deploy 연결 구조"
          x={440}
          y={1000}
        />
        <CanvasSectionLabel
          title="Export / AI Review"
          subtitle="명세 다운로드와 AI 리뷰 작업 흐름"
          x={440}
          y={2020}
        />
        <CanvasEdgeLayer nodes={visibleNodes} edges={visibleEdges} />
        {visibleNodes.map((node) => (
          <CanvasNodeCard
            key={node.id}
            node={node}
            selected={node.id === selectedNode.id}
            dragging={dragState?.nodeId === node.id}
            onPointerDown={(event) => beginNodeDrag(node, event)}
            onClick={() => setSelectedNodeId(node.id)}
          />
        ))}
      </div>

      <aside
        className={clsx(
          "absolute right-4 top-28 z-30 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[1.4rem] border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl transition-all duration-300",
          inspectorOpen ? "w-80 p-3" : "w-12 p-2",
        )}
        data-canvas-control="true"
        onWheel={stopCanvasWheel}
      >
        <button
          type="button"
          onClick={() => setInspectorOpen((value) => !value)}
          className="mb-3 grid h-9 w-full place-items-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10"
        >
          {inspectorOpen ? "Inspector →" : "←"}
        </button>
        {inspectorOpen && (
          <div className="space-y-3 text-sm text-white/80">
            <div
              className={clsx(
                "rounded-2xl border p-3",
                nodeTone[selectedNode.type],
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-black/25 text-lg">
                  {selectedNode.icon}
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                    {nodeLabel[selectedNode.type]}
                  </p>
                  <h4 className="text-base font-bold">{selectedNode.label}</h4>
                </div>
              </div>
              <p className="text-xs leading-5 opacity-75">
                {selectedNode.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoTile label="Source" value={selectedNode.source} />
              <InfoTile
                label="Position"
                value={`${Math.round(selectedNode.x)}, ${Math.round(selectedNode.y)}`}
              />
            </div>
            <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/55">
                  Analysis evidence
                </p>
                <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                  {confidenceLabel(selectedNode.confidence)}
                </span>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <InfoTile
                  label="Confidence"
                  value={typeof selectedNode.confidence === "number" ? `${Math.round(selectedNode.confidence * 100)}%` : "-"}
                />
                <InfoTile
                  label="Signals"
                  value={`${selectedNode.codeRefs.length + selectedNode.apiLinks.length + selectedNode.interactions.length}`}
                />
              </div>
              <div className="space-y-3">
                <EvidenceList label="Evidence files" items={selectedNode.evidence || selectedNode.codeRefs} />
                <EvidenceList label="API/data signals" items={selectedNode.apiLinks} />
                <EvidenceList
                  label="Import / action / docs"
                  items={selectedNode.interactions.filter((item) => /import|api|docs|\.md|:|fetch|navigate|render/i.test(item))}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-rose-200/15 bg-rose-300/[0.06] p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-rose-100/55">
                    AI suggestions
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/55">
                    {suggestionStatus}
                  </p>
                </div>
                <button
                  onClick={generateAiSuggestions}
                  className="rounded-lg border border-rose-200/25 bg-rose-300/15 px-2 py-1 text-[10px] font-semibold text-rose-50 hover:bg-rose-300/25"
                >
                  생성
                </button>
              </div>
              <div className="space-y-2">
                {pendingSuggestions.slice(0, 4).map((suggestion) => (
                  <div key={suggestion.id} className="rounded-xl border border-white/10 bg-black/25 p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                        {suggestion.action} · {suggestion.targetType}
                      </span>
                      <span className="text-[10px] text-white/35">
                        {suggestion.evidenceIds.length} evidence
                      </span>
                    </div>
                    <p className="text-[11px] leading-4 text-white/70">
                      {suggestion.rationale}
                    </p>
                    {"label" in suggestion.proposedValue || "title" in suggestion.proposedValue || "sectionName" in suggestion.proposedValue ? (
                      <p className="mt-1 truncate text-[10px] text-rose-100/55">
                        → {String(suggestion.proposedValue.label || suggestion.proposedValue.title || suggestion.proposedValue.sectionName)}
                      </p>
                    ) : null}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void decideSuggestion(suggestion.id, "approve")}
                        className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-black hover:bg-rose-100"
                      >
                        승인 적용
                      </button>
                      <button
                        onClick={() => void decideSuggestion(suggestion.id, "reject")}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/65 hover:bg-white/10"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
                {!pendingSuggestions.length && (
                  <p className="rounded-xl border border-white/10 bg-black/20 p-2 text-[11px] leading-4 text-white/45">
                    대기 중인 제안이 없습니다. `AI 제안 생성`을 누르면 현재 planning의 누락된 IA/wireframe/architecture 연결을 제안합니다.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                Edit selected node
              </p>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-[56px_1fr] items-center gap-2">
                  <label className="text-white/50">Icon</label>
                  <input value={selectedNode.icon} onChange={(event) => updateSelectedNode({ icon: event.target.value })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-cyan-200/50" />
                </div>
                <div className="grid grid-cols-[56px_1fr] items-center gap-2">
                  <label className="text-white/50">Type</label>
                  <select value={selectedNode.type} onChange={(event) => updateSelectedNode({ type: event.target.value as ProjectCanvasNodeType })} className="rounded-lg border border-white/10 bg-[#111827] px-2 py-1.5 text-white outline-none focus:border-cyan-200/50">
                    {editableNodeTypes.map((type) => <option key={type} value={type}>{nodeLabel[type]}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-[56px_1fr] items-center gap-2">
                  <label className="text-white/50">Shape</label>
                  <select value={selectedNode.shape} onChange={(event) => updateSelectedNode({ shape: event.target.value as ProjectCanvasNodeShape })} className="rounded-lg border border-white/10 bg-[#111827] px-2 py-1.5 text-white outline-none focus:border-cyan-200/50">
                    {editableNodeShapes.map((shape) => <option key={shape} value={shape}>{shape}</option>)}
                  </select>
                </div>
                <input value={selectedNode.label} onChange={(event) => updateSelectedNode({ label: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-cyan-200/50" />
                <textarea value={selectedNode.description} onChange={(event) => updateSelectedNode({ description: event.target.value })} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-cyan-200/50" />
                <button onClick={deleteSelectedNode} className="w-full rounded-lg border border-rose-200/30 bg-rose-300/15 px-2 py-1.5 font-semibold text-rose-50 hover:bg-rose-300/25">선택 노드 삭제</button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                Code / GitHub refs
              </p>
              <textarea
                value={selectedNode.codeRefs.join("\n")}
                onChange={(event) => updateSelectedNode({ codeRefs: splitLines(event.target.value) })}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-cyan-100 outline-none focus:border-cyan-200/50"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                Interactions
              </p>
              <textarea
                value={selectedNode.interactions.join("\n")}
                onChange={(event) => updateSelectedNode({ interactions: splitLines(event.target.value) })}
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs leading-5 text-white outline-none focus:border-cyan-200/50"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                API / Data links
              </p>
              <textarea
                value={selectedNode.apiLinks.join("\n")}
                onChange={(event) => updateSelectedNode({ apiLinks: splitLines(event.target.value) })}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-violet-400/10 px-2 py-1.5 text-[11px] text-violet-100 outline-none focus:border-cyan-200/50"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Tags</p>
              <input
                value={selectedNode.meta.join(", ")}
                onChange={(event) => updateSelectedNode({ meta: splitTags(event.target.value) })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-200/50"
              />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
