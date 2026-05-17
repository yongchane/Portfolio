import { NextResponse } from "next/server";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { analyzeRepoStructure } from "@/lib/ops/project-management-contract.mjs";
import { getGitHubRepoTree } from "@/lib/ops/github-live";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, context: { params: Promise<{ owner: string; repo: string }> }) {
  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo } = await context.params;
  const branch = new URL(request.url).searchParams.get("branch") || "HEAD";
  const proxied = await proxyOpsApiRequest({
    path: `/ops/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree?branch=${encodeURIComponent(branch)}`,
  });
  if (proxied) return proxied;

  try {
    const tree = await getGitHubRepoTree(owner, repo, branch);
    const analysis = analyzeRepoStructure({ files: tree.files.map((file) => file.path) });
    return NextResponse.json({
      ok: true,
      tree,
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "GitHub tree fetch failed" },
      { status: 502 },
    );
  }
}
