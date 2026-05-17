import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { analyzeRepoStructure } from "@/lib/ops/project-management-contract.mjs";
import type { RepoAnalysisResult } from "@/components/ops/project-management/mock-data";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "tmp",
  ".turbo",
  "coverage",
]);

const portfolioRepoNames = new Set(["yongchane/Portfolio", "Portfolio"]);
const maxAnalyzedFileBytes = 80_000;

function isAnalyzableTextFile(filePath: string) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|json|md|mdx|sql|yml|yaml)$/i.test(filePath);
}

async function collectFiles(root: string, current = ""): Promise<string[]> {
  const absolute = path.join(root, current);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await collectFiles(root, relative));
      continue;
    }

    if (entry.isFile()) files.push(relative);
  }

  return files;
}

export async function getLocalRepoAnalysis(repoName?: string | null): Promise<RepoAnalysisResult | null> {
  if (!repoName || !portfolioRepoNames.has(repoName)) return null;

  const files = await collectFiles(process.cwd());
  const fileContents: Record<string, string> = {};

  await Promise.all(
    files.filter(isAnalyzableTextFile).map(async (file) => {
      const absolute = path.join(process.cwd(), file);
      const info = await stat(absolute);
      if (info.size > maxAnalyzedFileBytes) return;

      fileContents[file] = await readFile(absolute, "utf8");
    }),
  );

  return analyzeRepoStructure({ files, fileContents }) as RepoAnalysisResult;
}
