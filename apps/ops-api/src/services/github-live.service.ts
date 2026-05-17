import { Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

@Injectable()
export class GitHubLiveService {
  private async ghJson(args: string[]) {
    const { stdout } = await execFileAsync("gh", args, {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 12 * 1024 * 1024,
    });

    return JSON.parse(stdout) as unknown;
  }

  async getRepoTree(owner: string, repo: string, branch = "HEAD") {
    const fullRepo = `${owner}/${repo}`;
    const refData = await this.ghJson([
      "api",
      `repos/${fullRepo}/git/trees/${branch}?recursive=1`,
    ]) as {
      tree?: Array<{ path?: string; type?: string; size?: number; sha?: string; url?: string }>;
      truncated?: boolean;
    };

    return {
      repo: fullRepo,
      branch,
      truncated: Boolean(refData.truncated),
      files: (refData.tree || [])
        .filter((item) => item.type === "blob" && item.path)
        .map((item) => ({
          path: String(item.path),
          size: item.size,
          sha: item.sha,
          url: item.url,
        })),
    };
  }

  async getRepoSnapshot(repoName: string) {
    const data = await this.ghJson(["api", `repos/${repoName}`]) as {
      html_url?: string;
      description?: string | null;
      private?: boolean;
      visibility?: string;
      default_branch?: string;
      pushed_at?: string;
      updated_at?: string;
      stargazers_count?: number;
      forks_count?: number;
      subscribers_count?: number;
      watchers_count?: number;
      language?: string | null;
      topics?: string[];
      has_projects?: boolean;
      archived?: boolean;
    };
    const [owner, name] = repoName.split("/");

    return {
      repo: repoName,
      name,
      owner,
      url: data.html_url || `https://github.com/${repoName}`,
      description: data.description || "",
      visibility: data.private ? "private" : (data.visibility || "public"),
      defaultBranch: data.default_branch || "main",
      pushedAt: data.pushed_at,
      updatedAt: data.updated_at,
      stargazerCount: data.stargazers_count,
      forkCount: data.forks_count,
      openIssuesCount: 0,
      openPullRequestsCount: 0,
      watchersCount: data.subscribers_count ?? data.watchers_count,
      primaryLanguage: data.language || undefined,
      topics: data.topics || [],
      hasProjectsEnabled: data.has_projects,
      isArchived: data.archived,
    };
  }

  async getFileContents(owner: string, repo: string, paths: string[], branch = "HEAD") {
    const fullRepo = `${owner}/${repo}`;
    const uniquePaths = [...new Set(paths.filter(Boolean))].slice(0, 40);
    const contents: Record<string, string> = {};
    const warnings: string[] = [];

    for (const filePath of uniquePaths) {
      try {
        const data = await this.ghJson([
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
}
