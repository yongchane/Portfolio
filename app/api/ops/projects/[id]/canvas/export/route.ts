import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";
import { buildCanvasMarkdown, buildProjectCanvasResponse } from "@/lib/ops/project-management-contract.mjs";
import { getStoredProjectCanvas } from "@/lib/ops/project-canvas-store";
import { getLocalRepoAnalysis } from "@/lib/ops/repo-analysis-server";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null) as { canvas?: unknown } | null;
  const proxied = await proxyOpsApiRequest({
    path: `/ops/projects/${encodeURIComponent(id)}/canvas/export`,
    method: "POST",
    body: payload,
  });
  if (proxied) return proxied;

  const data = await getOpsConsoleData();
  const project = data.projects.find((item) => item.id === id);
  const repoName = project?.repo || data.github.repoSnapshots.find((repo) => repo.repo.includes(id))?.repo;
  const analysis = await getLocalRepoAnalysis(repoName);
  const response = buildProjectCanvasResponse(data, id, analysis);
  if (!response) {
    return NextResponse.json({ ok: false, message: "Project canvas not found" }, { status: 404 });
  }

  const stored = await getStoredProjectCanvas(id);
  const canvas = payload?.canvas && typeof payload.canvas === "object"
    ? payload.canvas
    : stored?.canvas ?? response.canvas;
  const generatedAt = new Date().toISOString();
  const markdown = buildCanvasMarkdown({
    project: response.project,
    repo: response.repo,
    canvas,
    generatedAt,
  });

  return NextResponse.json({
    ok: true,
    filename: `${id}-canvas.md`,
    generatedAt,
    markdown,
  });
}
