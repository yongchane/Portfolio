"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { InfoTile } from "@/components/ops/shared";
import type { OpsConsoleData } from "@/lib/ops/types";
import {
  buildCanvasNodes,
  canvasEdges,
  findProjectByRepo,
  findRepoByProjectId,
  type ProjectCanvasNode,
  type ProjectCanvasNodeShape,
  type ProjectCanvasNodeType,
} from "@/components/ops/project-management/mock-data";
import { getCanvasControlBarState } from "@/components/ops/project-management/canvas-control-bar.mjs";

const CANVAS_WIDTH = 5200;
const CANVAS_HEIGHT = 3600;

type CanvasModuleKey = "ia" | "architecture" | "export" | "deploy";

const canvasModules: Array<{
  key: CanvasModuleKey;
  title: string;
  desc: string;
  pan: { x: number; y: number };
  zoom: number;
}> = [
  {
    key: "ia",
    title: "페이지별 기능 IA",
    desc: "Page/Feature 흐름과 사용자 이동",
    pan: { x: 120, y: 90 },
    zoom: 1,
  },
  {
    key: "architecture",
    title: "System Architecture",
    desc: "GitHub/API/DB/Deploy 연결",
    pan: { x: 70, y: -690 },
    zoom: 0.92,
  },
  {
    key: "export",
    title: "Export / AI Review",
    desc: "명세/이미지 출력과 AI 검토",
    pan: { x: 90, y: -1450 },
    zoom: 0.92,
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
  page: "border-cyan-300/40 bg-cyan-400/10 text-cyan-50",
  feature: "border-amber-300/40 bg-amber-400/10 text-amber-50",
  api: "border-violet-300/40 bg-violet-400/10 text-violet-50",
  database: "border-emerald-300/40 bg-emerald-400/10 text-emerald-50",
  deploy: "border-sky-300/40 bg-sky-400/10 text-sky-50",
  docs: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-50",
  agent: "border-rose-300/40 bg-rose-400/10 text-rose-50",
  start: "border-white/35 bg-white/10 text-white",
  decision: "border-orange-300/50 bg-orange-400/10 text-orange-50",
  export: "border-lime-300/45 bg-lime-400/10 text-lime-50",
};

const nodeLabel: Record<ProjectCanvasNodeType, string> = {
  repo: "Repo",
  page: "Page",
  feature: "Feature",
  api: "API",
  database: "DB",
  deploy: "Deploy",
  docs: "Docs",
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

const CanvasEdgeLayer = ({ nodes }: { nodes: ProjectCanvasNode[] }) => {
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
      {canvasEdges.map((edge) => {
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

export function ProjectCanvasPage({
  data,
  projectId,
}: {
  data: OpsConsoleData;
  projectId: string;
}) {
  const repo = findRepoByProjectId(data, projectId);
  const project = findProjectByRepo(data, repo);
  const initialNodes = useMemo(
    () => buildCanvasNodes(repo, project?.deployUrl),
    [repo, project?.deployUrl],
  );
  const [nodes, setNodes] = useState<ProjectCanvasNode[]>(initialNodes);
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
  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) || nodes[0];

  useEffect(() => {
    setNodes(initialNodes);
    setSelectedNodeId("entry");
    setPan({ x: 120, y: 90 });
    setZoom(1);
  }, [initialNodes]);

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
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
              Figma-style project detail canvas
            </p>
            <h1 className="text-lg font-black">
              {repo?.repo || "프로젝트 canvas"}
            </h1>
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
        >
          {[
            "+ Node 추가",
            "Markdown Export",
            "Canvas PNG 다운로드",
            "AI Agent 리뷰",
          ].map((action) => (
            <button
              key={action}
              className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/75 shadow-xl backdrop-blur transition hover:bg-white/10"
            >
              {action}
            </button>
          ))}
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
        <div className="absolute left-[180px] top-[160px] h-[520px] w-[1280px] rounded-[3rem] border border-cyan-300/10 bg-cyan-300/[0.03]" />
        <div className="absolute left-[430px] top-[840px] h-[600px] w-[1280px] rounded-[3rem] border border-violet-300/10 bg-violet-300/[0.03]" />
        <div className="absolute left-[430px] top-[1660px] h-[560px] w-[1120px] rounded-[3rem] border border-amber-300/10 bg-amber-300/[0.03]" />
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
          y={800}
        />
        <CanvasSectionLabel
          title="Export / AI Review"
          subtitle="명세 다운로드와 AI 리뷰 작업 흐름"
          x={440}
          y={1620}
        />
        <CanvasEdgeLayer nodes={nodes} />
        {nodes.map((node) => (
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                Code / GitHub refs
              </p>
              <div className="space-y-2">
                {selectedNode.codeRefs.map((item) => (
                  <code
                    key={item}
                    className="block rounded-lg bg-black/30 px-2 py-1 text-[11px] text-cyan-100"
                  >
                    {item}
                  </code>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                Interactions
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-white/70">
                {selectedNode.interactions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                API / Data links
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedNode.apiLinks.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-violet-400/10 px-3 py-1 text-[11px] text-violet-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedNode.meta.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
