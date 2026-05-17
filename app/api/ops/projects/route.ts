import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";
import { getGitHubUserRepositories } from "@/lib/ops/github-live";
import { addProjectFromGitHubRepo } from "@/lib/ops/mutations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getOpsConsoleData();
  const projectByRepo = new Map(
    data.projects
      .filter((project) => typeof project.repo === "string" && project.repo)
      .map((project) => [project.repo, project]),
  );

  try {
    const liveRepositories = await getGitHubUserRepositories();
    return NextResponse.json({
      ok: true,
      source: "live-github",
      repositories: liveRepositories.map((repo) => ({
        ...repo,
        managed: projectByRepo.has(repo.repo),
        project: projectByRepo.get(repo.repo),
      })),
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      source: "github-cache",
      warning: error instanceof Error ? error.message : "GitHub repository fetch failed",
      repositories: data.github.repoSnapshots.map((repo) => ({
        ...repo,
        managed: projectByRepo.has(repo.repo),
        project: projectByRepo.get(repo.repo),
      })),
    });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const repoName = typeof payload?.repo === "string" ? payload.repo.trim() : "";
  if (!repoName) {
    return NextResponse.json({ ok: false, message: "repo is required" }, { status: 400 });
  }

  const data = await getOpsConsoleData();
  let repo = data.github.repoSnapshots.find((snapshot) => snapshot.repo === repoName);
  if (!repo) {
    try {
      repo = (await getGitHubUserRepositories()).find((snapshot) => snapshot.repo === repoName);
    } catch {
      repo = undefined;
    }
  }
  if (!repo) {
    return NextResponse.json({ ok: false, message: "Repository not found in GitHub repositories" }, { status: 404 });
  }

  try {
    const project = await addProjectFromGitHubRepo({ repo });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Project create failed" },
      { status: 400 },
    );
  }
}
