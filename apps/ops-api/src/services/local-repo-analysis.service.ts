import { Injectable } from "@nestjs/common";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ContractService } from "./contract.service";
import { GitHubLiveService } from "./github-live.service";
import { repoRoot } from "./repo-root";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "tmp",
]);

const contentExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".md",
  ".sql",
  ".yml",
  ".yaml",
]);

@Injectable()
export class LocalRepoAnalysisService {
  constructor(
    private readonly contract: ContractService,
    private readonly github: GitHubLiveService,
  ) {}

  async analyzeProjectRepo(repoName?: string | null, branch?: string | null) {
    if (!repoName) return null;
    if (repoName === "yongchane/Portfolio") {
      return this.analyzeLocalPortfolioRepo();
    }

    return this.analyzeLiveGitHubRepo(repoName, branch || "HEAD");
  }

  private async analyzeLocalPortfolioRepo() {
    const root = repoRoot();
    const files: string[] = [];
    const fileContents: Record<string, string> = {};

    await this.walk(root, root, files, fileContents);
    return this.contract.analyzeRepoStructure({ files, fileContents });
  }

  private async analyzeLiveGitHubRepo(repoName: string, branch: string) {
    const [owner, repo] = repoName.split("/");
    if (!owner || !repo) return null;

    const tree = await this.github.getRepoTree(owner, repo, branch);
    const contentPaths = this.selectContentPaths(tree.files.map((file) => file.path));
    const content = await this.github.getFileContents(owner, repo, contentPaths, branch);

    return this.contract.analyzeRepoStructure({
      files: tree.files.map((file) => file.path),
      fileContents: content.contents,
    });
  }

  private selectContentPaths(files: string[]) {
    const ranked = files
      .filter((filePath) => contentExtensions.has(path.extname(filePath)))
      .map((filePath) => ({
        filePath,
        score: this.contentPathScore(filePath),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));

    return ranked.slice(0, 35).map((item) => item.filePath);
  }

  private contentPathScore(filePath: string) {
    let score = 0;
    if (/^app\/.+\/(page|layout|route)\.(tsx|ts)$/.test(filePath)) score += 100;
    if (/^pages\/.+\.(tsx|ts|jsx|js)$/.test(filePath)) score += 80;
    if (/components?\//.test(filePath)) score += 45;
    if (/(services?|lib|server|api|hooks)\//.test(filePath)) score += 42;
    if (/\.(md|mdx)$/.test(filePath)) score += 35;
    if (/(package\.json|next\.config|vite\.config|tailwind\.config|vercel\.json|supabase|schema|migration)/.test(filePath)) score += 30;
    if (/(node_modules|dist|build|coverage|lock|\.next)/.test(filePath)) score = 0;
    return score;
  }

  private async walk(
    root: string,
    directory: string,
    files: string[],
    fileContents: Record<string, string>,
  ) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, "/");

      if (entry.isDirectory()) {
        await this.walk(root, absolutePath, files, fileContents);
        continue;
      }

      if (!entry.isFile()) continue;
      files.push(relativePath);

      const extension = path.extname(entry.name);
      if (!contentExtensions.has(extension)) continue;

      const stats = await stat(absolutePath);
      if (stats.size > 120_000) continue;

      fileContents[relativePath] = await readFile(absolutePath, "utf8").catch(() => "");
    }
  }
}
