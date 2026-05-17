import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { analyzeRepoStructure } from "@/lib/ops/project-management-contract.mjs";
import { getGitHubFileContents } from "@/lib/ops/github-live";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request, context: { params: Promise<{ owner: string; repo: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo } = await context.params;
  const payload = await request.json().catch(() => null) as { paths?: string[]; branch?: string } | null;
  const proxied = await proxyOpsApiRequest({
    path: `/ops/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/content`,
    method: "POST",
    body: payload,
  });
  if (proxied) return proxied;

  const paths = Array.isArray(payload?.paths) ? payload.paths.filter((item) => typeof item === "string") : [];
  if (!paths.length) {
    return NextResponse.json({ ok: false, message: "paths are required" }, { status: 400 });
  }

  try {
    const result = await getGitHubFileContents(owner, repo, paths, payload?.branch || "HEAD");
    const analysis = analyzeRepoStructure({ files: paths, fileContents: result.contents });
    return NextResponse.json({
      ok: true,
      ...result,
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "GitHub content fetch failed" },
      { status: 502 },
    );
  }
}
