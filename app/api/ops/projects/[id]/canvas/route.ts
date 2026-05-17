import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";
import { buildProjectCanvasResponse } from "@/lib/ops/project-management-contract.mjs";
import { getStoredProjectCanvas, saveStoredProjectCanvas } from "@/lib/ops/project-canvas-store";
import { getLocalRepoAnalysis } from "@/lib/ops/repo-analysis-server";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const proxied = await proxyOpsApiRequest({ path: `/ops/projects/${encodeURIComponent(id)}/canvas` });
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

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    ...response,
    source: stored ? "saved-canvas" : response.source,
    canvas: stored?.canvas ?? response.canvas,
    savedAt: stored?.updatedAt,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const proxied = await proxyOpsApiRequest({
    path: `/ops/projects/${encodeURIComponent(id)}/canvas`,
    method: "PATCH",
    body: payload,
  });
  if (proxied) return proxied;

  const data = await getOpsConsoleData();
  const response = buildProjectCanvasResponse(data, id, null);
  if (!response) {
    return NextResponse.json({ ok: false, message: "Project canvas not found" }, { status: 404 });
  }

  try {
    const stored = await saveStoredProjectCanvas(id, payload?.canvas ?? payload);
    return NextResponse.json({
      ok: true,
      projectId: id,
      source: "saved-canvas",
      canvas: stored.canvas,
      savedAt: stored.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Canvas save failed" },
      { status: 400 },
    );
  }
}
