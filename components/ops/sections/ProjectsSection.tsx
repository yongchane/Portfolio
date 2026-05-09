"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { InfoTile, Panel } from "@/components/ops/shared";
import type { ProjectsSectionProps } from "@/components/ops/sections/types";
import type { GitHubRepoSnapshot } from "@/lib/ops/types";

type CanvasNodeType = "repo" | "frontend" | "api" | "database" | "ia" | "deploy" | "docs" | "agent";

type CanvasNode = {
  id: string;
  type: CanvasNodeType;
  label: string;
  description: string;
  x: number;
  y: number;
  source: "github-analysis" | "user-created" | "ai-suggestion";
  meta: string[];
};

type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

const nodeTone: Record<CanvasNodeType, string> = {
  repo: "border-slate-200/30 bg-slate-300/10 text-slate-50",
  frontend: "border-cyan-300/40 bg-cyan-400/10 text-cyan-50",
  api: "border-violet-300/40 bg-violet-400/10 text-violet-50",
  database: "border-emerald-300/40 bg-emerald-400/10 text-emerald-50",
  ia: "border-amber-300/40 bg-amber-400/10 text-amber-50",
  deploy: "border-sky-300/40 bg-sky-400/10 text-sky-50",
  docs: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-50",
  agent: "border-rose-300/40 bg-rose-400/10 text-rose-50",
};

const nodeLabel: Record<CanvasNodeType, string> = {
  repo: "GitHub Repo",
  frontend: "Frontend",
  api: "Backend API",
  database: "Database",
  ia: "IA / Flow",
  deploy: "Deploy",
  docs: "Docs",
  agent: "AI Agent",
};

const mockEdges: CanvasEdge[] = [
  { id: "edge-repo-frontend", source: "repo", target: "frontend", label: "contains UI" },
  { id: "edge-repo-api", source: "repo", target: "api", label: "contains routes" },
  { id: "edge-api-db", source: "api", target: "database", label: "reads / writes" },
  { id: "edge-frontend-api", source: "frontend", target: "api", label: "fetches" },
  { id: "edge-ia-frontend", source: "ia", target: "frontend", label: "drives screens" },
  { id: "edge-repo-docs", source: "repo", target: "docs", label: "documents" },
  { id: "edge-agent-ia", source: "agent", target: "ia", label: "reviews" },
  { id: "edge-deploy-repo", source: "deploy", target: "repo", label: "ships" },
];

function buildMockNodes(repo?: GitHubRepoSnapshot): CanvasNode[] {
  const repoName = repo?.repo || "yongchane/Portfolio";
  return [
    {
      id: "repo",
      type: "repo",
      label: repoName,
      description: "선택한 GitHub 레포지토리입니다. 이후 API 연동 단계에서 실제 GitHub tree 분석 결과를 기준으로 canvas를 생성합니다.",
      x: 80,
      y: 210,
      source: "github-analysis",
      meta: [repo?.defaultBranch ? `default ${repo.defaultBranch}` : "default branch", repo?.visibility || "visibility", "repo tree source"],
    },
    {
      id: "frontend",
      type: "frontend",
      label: "App Router / UI Layer",
      description: "사용자가 보는 페이지, 레이아웃, 컴포넌트 구조입니다. 화면 IA와 연결해서 유지보수 방향을 설계합니다.",
      x: 420,
      y: 70,
      source: "github-analysis",
      meta: ["app/", "components/", "client fetch"],
    },
    {
      id: "api",
      type: "api",
      label: "Next.js Backend API",
      description: "프론트엔드가 호출하는 실제 API 계층입니다. 앞으로 모든 기능은 이 API 응답을 기준으로 렌더링합니다.",
      x: 420,
      y: 260,
      source: "github-analysis",
      meta: ["app/api/", "route.ts", "auth guard"],
    },
    {
      id: "database",
      type: "database",
      label: "Supabase DB",
      description: "프로젝트, canvas nodes/edges, export, AI review 결과가 저장될 데이터베이스입니다.",
      x: 760,
      y: 260,
      source: "user-created",
      meta: ["ops_projects", "ops_project_canvas_nodes", "ops_project_exports"],
    },
    {
      id: "ia",
      type: "ia",
      label: "IA / User Flow",
      description: "홈 → 프로젝트 리스트 → 프로젝트 canvas → export/AI review로 이어지는 사용자 흐름입니다.",
      x: 760,
      y: 70,
      source: "user-created",
      meta: ["project list", "canvas", "inspector", "export"],
    },
    {
      id: "deploy",
      type: "deploy",
      label: "Deploy / Status",
      description: "배포 상태, 보안 상태, 마지막 수정일을 프로젝트 리스트에 보여주는 운영 신호입니다.",
      x: 80,
      y: 430,
      source: "github-analysis",
      meta: ["Vercel", "GitHub Actions", "security"],
    },
    {
      id: "docs",
      type: "docs",
      label: "Spec / Markdown Export",
      description: "canvas를 기능 명세서, IA 문서, AI 작업 프롬프트로 변환하는 산출물 영역입니다.",
      x: 420,
      y: 450,
      source: "user-created",
      meta: ["markdown", "png", "prompt"],
    },
    {
      id: "agent",
      type: "agent",
      label: "AI Agent Review",
      description: "Cursor처럼 설계 방향이 유지보수에 적절한지 AI 에이전트와 함께 검토하는 영역입니다.",
      x: 760,
      y: 450,
      source: "ai-suggestion",
      meta: ["architecture review", "IA review", "risk"],
    },
  ];
}

function statusTone(status: string) {
  if (status === "healthy") return "bg-emerald-100 text-emerald-700";
  if (status === "warning") return "bg-amber-100 text-amber-700";
  if (status === "risk") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function ProjectListCard({ repo, selected, onClick }: { repo: GitHubRepoSnapshot; selected: boolean; onClick: () => void }) {
  const securityStatus = repo.openIssuesCount && repo.openIssuesCount > 5 ? "warning" : "healthy";
  const deployStatus = repo.pushedAt ? "healthy" : "unknown";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/10",
        selected ? "border-cyan-200/50 bg-cyan-400/10 shadow-xl shadow-cyan-950/30" : "border-white/10 bg-white/5",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">repository</p>
          <strong className="mt-1 block text-lg text-white">{repo.name}</strong>
          <p className="mt-1 text-xs text-white/45">{repo.repo}</p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/65">{repo.visibility}</span>
      </div>
      <p className="mb-4 line-clamp-2 text-sm leading-6 text-white/65">{repo.description || "설명 없음"}</p>
      <div className="grid gap-2 text-xs text-white/70 md:grid-cols-2">
        <span className="rounded-full bg-black/20 px-2 py-1">수정 {repo.pushedAt || repo.updatedAt || "미기록"}</span>
        <span className={clsx("rounded-full px-2 py-1 font-semibold", statusTone(deployStatus))}>배포 {deployStatus}</span>
        <span className={clsx("rounded-full px-2 py-1 font-semibold", statusTone(securityStatus))}>보안 {securityStatus}</span>
        <span className="rounded-full bg-black/20 px-2 py-1">PR {repo.openPullRequestsCount ?? 0} · Issue {repo.openIssuesCount ?? 0}</span>
      </div>
    </button>
  );
}

function CanvasEdgeLayer({ nodes, edges }: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1040 640" preserveAspectRatio="none">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.45)" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return null;
        const x1 = source.x + 120;
        const y1 = source.y + 44;
        const x2 = target.x + 120;
        const y2 = target.y + 44;
        const midX = (x1 + x2) / 2;
        return (
          <g key={edge.id}>
            <path
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
            <text x={midX} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="fill-white/45 text-[10px]">
              {edge.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CanvasNodeCard({ node, selected, onClick }: { node: CanvasNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ left: node.x, top: node.y }}
      className={clsx(
        "absolute w-[240px] rounded-3xl border p-4 text-left shadow-2xl backdrop-blur transition hover:-translate-y-1",
        nodeTone[node.type],
        selected && "ring-2 ring-white/45",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-55">{nodeLabel[node.type]}</p>
          <strong className="mt-1 block text-base leading-5">{node.label}</strong>
        </div>
        <span className="rounded-full bg-black/20 px-2 py-1 text-[10px] opacity-70">{node.source}</span>
      </div>
      <p className="line-clamp-3 text-xs leading-5 opacity-70">{node.description}</p>
    </button>
  );
}

export function ProjectsSection({ data }: ProjectsSectionProps) {
  const repos = useMemo(() => data.github.repoSnapshots.slice(0, 6), [data.github.repoSnapshots]);
  const fallbackRepo = repos[0];
  const [selectedRepoName, setSelectedRepoName] = useState(fallbackRepo?.repo || "");
  const selectedRepo = repos.find((repo) => repo.repo === selectedRepoName) || fallbackRepo;
  const nodes = useMemo(() => buildMockNodes(selectedRepo), [selectedRepo]);
  const [selectedNodeId, setSelectedNodeId] = useState("repo");
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || nodes[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Project Management</p>
          <h2 className="mb-3 text-4xl font-black">프로젝트 관리 캔버스</h2>
          <p className="max-w-3xl text-sm leading-6 text-white/70">
            GitHub 레포를 선택하면 시스템 아키텍처와 IA를 n8n처럼 시각화하고, 직접 수정한 설계를 Markdown / 이미지 / AI 작업 프롬프트로 출력하는 화면입니다. 현재는 UI 검증용 목업입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["GitHub Sync", "Analyze Repo", "Save Canvas", "Export Markdown", "Export PNG", "Ask AI"].map((action) => (
            <button key={action} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10">
              {action}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <Panel title="GitHub 프로젝트 리스트">
            <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-xs leading-6 text-cyan-50/90">
              <p className="font-semibold">다음 단계에서 실제 API로 교체할 영역</p>
              <p className="mt-1">GET /api/ops/github/repositories → POST /api/ops/projects → GET /api/ops/projects 흐름으로 연결 예정입니다.</p>
            </div>
            <div className="space-y-3">
              {repos.map((repo) => (
                <ProjectListCard
                  key={repo.repo}
                  repo={repo}
                  selected={repo.repo === selectedRepo?.repo}
                  onClick={() => {
                    setSelectedRepoName(repo.repo);
                    setSelectedNodeId("repo");
                  }}
                />
              ))}
            </div>
          </Panel>
        </aside>

        <section className="grid gap-6 2xl:grid-cols-[1fr_340px]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">Architecture / IA Canvas</p>
                <h3 className="mt-1 text-xl font-bold">{selectedRepo?.repo || "레포 선택 필요"}</h3>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/60">
                <span className="rounded-full bg-white/10 px-3 py-1">nodes {nodes.length}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">edges {mockEdges.length}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">mode mock</span>
              </div>
            </div>

            <div className="relative h-[640px] overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.11)_1px,transparent_0)] [background-size:28px_28px]">
              <div className="relative h-[640px] min-w-[1040px]">
                <CanvasEdgeLayer nodes={nodes} edges={mockEdges} />
                {nodes.map((node) => (
                  <CanvasNodeCard
                    key={node.id}
                    node={node}
                    selected={node.id === selectedNode?.id}
                    onClick={() => setSelectedNodeId(node.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <Panel title="Node Inspector">
              {selectedNode ? (
                <div className="space-y-4 text-sm text-white/80">
                  <div className={clsx("rounded-3xl border p-4", nodeTone[selectedNode.type])}>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] opacity-60">{nodeLabel[selectedNode.type]}</p>
                    <h4 className="text-xl font-bold">{selectedNode.label}</h4>
                    <p className="mt-3 text-sm leading-6 opacity-75">{selectedNode.description}</p>
                  </div>
                  <div className="grid gap-3">
                    <InfoTile label="Source" value={selectedNode.source} />
                    <InfoTile label="Position" value={`${selectedNode.x}, ${selectedNode.y}`} />
                    <InfoTile label="Editable" value="true · next API phase" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Metadata</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedNode.meta.map((item) => (
                        <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-white/60">
                    이 패널은 다음 단계에서 노드 label/description/type/source/metadata를 직접 수정하고 PATCH /api/ops/projects/:id/canvas로 저장하는 편집 폼이 됩니다.
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60">노드를 선택해 주세요.</p>
              )}
            </Panel>

            <Panel title="Export Preview">
              <div className="space-y-3 text-sm text-white/75">
                <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10">Markdown 기능명세서 생성</button>
                <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10">Canvas PNG 다운로드</button>
                <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10">AI 리뷰 요청 프롬프트 생성</button>
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </div>
  );
}
