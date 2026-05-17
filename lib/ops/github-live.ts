import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function ghJson(args: string[]) {
  const { stdout } = await execFileAsync("gh", args, {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 12 * 1024 * 1024,
  });
  return JSON.parse(stdout) as unknown;
}

export async function getGitHubUserRepositories() {
  const rows = await ghJson([
    "api",
    "user/repos?per_page=100&sort=updated&type=owner",
  ]) as Array<Record<string, unknown>>;

  return rows.map((repo) => {
    const owner = repo.owner && typeof repo.owner === "object"
      ? repo.owner as Record<string, unknown>
      : {};
    const ownerLogin = typeof owner.login === "string" ? owner.login : "unknown";
    const name = typeof repo.name === "string" ? repo.name : "repository";

    return {
      repo: `${ownerLogin}/${name}`,
      name,
      owner: ownerLogin,
      url: typeof repo.html_url === "string" ? repo.html_url : `https://github.com/${ownerLogin}/${name}`,
      description: typeof repo.description === "string" ? repo.description : "",
      visibility: repo.private ? "private" : (typeof repo.visibility === "string" ? repo.visibility : "public"),
      defaultBranch: typeof repo.default_branch === "string" ? repo.default_branch : "main",
      pushedAt: typeof repo.pushed_at === "string" ? repo.pushed_at : undefined,
      updatedAt: typeof repo.updated_at === "string" ? repo.updated_at : undefined,
      stargazerCount: typeof repo.stargazers_count === "number" ? repo.stargazers_count : undefined,
      forkCount: typeof repo.forks_count === "number" ? repo.forks_count : undefined,
      openIssuesCount: typeof repo.open_issues_count === "number" ? repo.open_issues_count : undefined,
      watchersCount: typeof repo.watchers_count === "number" ? repo.watchers_count : undefined,
      primaryLanguage: typeof repo.language === "string" ? repo.language : undefined,
      topics: Array.isArray(repo.topics) ? repo.topics.filter((item): item is string => typeof item === "string") : [],
      hasProjectsEnabled: typeof repo.has_projects === "boolean" ? repo.has_projects : undefined,
      isArchived: typeof repo.archived === "boolean" ? repo.archived : undefined,
    };
  });
}

export async function getGitHubRepoTree(owner: string, repo: string, branch = "HEAD") {
  const fullRepo = `${owner}/${repo}`;
  const refData = await ghJson(["api", `repos/${fullRepo}/git/trees/${branch}?recursive=1`]) as {
    tree?: Array<{ path?: string; type?: string; size?: number; sha?: string; url?: string }>;
    truncated?: boolean;
  };
  const files = (refData.tree || [])
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => ({
      path: String(item.path),
      size: item.size,
      sha: item.sha,
      url: item.url,
    }));

  return {
    repo: fullRepo,
    branch,
    truncated: Boolean(refData.truncated),
    files,
  };
}

export async function getGitHubFileContents(owner: string, repo: string, paths: string[], branch = "HEAD") {
  const fullRepo = `${owner}/${repo}`;
  const uniquePaths = [...new Set(paths.filter(Boolean))].slice(0, 40);
  const contents: Record<string, string> = {};
  const warnings: string[] = [];

  for (const filePath of uniquePaths) {
    try {
      const data = await ghJson([
        "api",
        `repos/${fullRepo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
      ]) as { content?: string; encoding?: string; size?: number };

      if (data.encoding === "base64" && data.content && (data.size ?? 0) <= 120_000) {
        contents[filePath] = Buffer.from(data.content, "base64").toString("utf8");
      }
    } catch (error) {
      warnings.push(`${filePath}: ${error instanceof Error ? error.message : "content fetch failed"}`);
    }
  }

  return {
    repo: fullRepo,
    branch,
    contents,
    warnings,
  };
}
