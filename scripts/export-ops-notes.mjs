#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import os from "os";

const repoRoot = process.cwd();
const OUTPUT_PATH = path.join(repoRoot, "data", "ops", "notes-export.json");
const DEFAULT_SOURCE_CONFIG = {
  workspaceRoot: resolveWorkspaceRoot(),
  roots: ["obsidian-vault", "docs"],
};

async function main() {
  const sourceConfig = await resolveSourceConfig();
  const notes = await loadNotes(sourceConfig);

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      mode: "export",
      workspaceRoot: sourceConfig.workspaceRoot,
      roots: sourceConfig.roots,
      resolvedRoots: sourceConfig.resolvedRoots,
    },
    notes,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`Exported ${notes.length} notes → ${path.relative(repoRoot, OUTPUT_PATH)}`);
  for (const root of sourceConfig.resolvedRoots) {
    console.log(`- source: ${root.label} (${root.path})`);
  }
}

async function resolveSourceConfig() {
  const explicitRoots = parseList(process.env.PORTFOLIO_OPS_NOTE_ROOTS);
  const workspaceRoot = process.env.PORTFOLIO_OPS_WORKSPACE_ROOT
    ? path.resolve(process.env.PORTFOLIO_OPS_WORKSPACE_ROOT)
    : DEFAULT_SOURCE_CONFIG.workspaceRoot;

  let roots = [];
  if (explicitRoots.length > 0) {
    roots = explicitRoots.map((rootPath) => ({
      label: inferRootLabel(rootPath),
      path: path.resolve(rootPath),
    }));
  } else {
    roots = DEFAULT_SOURCE_CONFIG.roots.map((rootName) => ({
      label: rootName,
      path: path.join(workspaceRoot, rootName),
    }));
  }

  const resolvedRoots = [];
  for (const root of roots) {
    try {
      const stat = await fs.stat(root.path);
      if (stat.isDirectory()) {
        resolvedRoots.push(root);
      }
    } catch {
      // Ignore missing roots so local workflow can stay flexible.
    }
  }

  return {
    workspaceRoot,
    roots: roots.map((root) => root.label),
    resolvedRoots,
  };
}

async function loadNotes(sourceConfig) {
  const markdownFiles = (
    await Promise.all(sourceConfig.resolvedRoots.map((root) => collectMarkdownFiles(root.path)))
  ).flat();

  const uniqueFiles = [...new Set(markdownFiles.map((filePath) => path.resolve(filePath)))];
  const notes = await Promise.all(
    uniqueFiles.map((filePath) => buildNoteItem(sourceConfig, filePath)),
  );

  return notes
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function collectMarkdownFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(entryPath);
    }
    return /\.mdx?$/i.test(entry.name) ? [entryPath] : [];
  }));

  return nested.flat();
}

async function buildNoteItem(sourceConfig, filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const stat = await fs.stat(filePath);
  const parsed = parseFrontmatter(raw);
  const content = parsed.content.trim();
  const relativePath = toExportRelativePath(sourceConfig, filePath);
  const contentLines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const headings = contentLines.filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, "").trim()).slice(0, 6);
  const bullets = contentLines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .slice(0, 5);
  const preview = contentLines
    .filter((line) => !line.startsWith("#") && !/^[-*]\s+/.test(line))
    .slice(0, 4);

  const title = headings[0] || prettifyTitle(path.basename(relativePath, path.extname(relativePath)));
  const summary = preview[0] || bullets[0] || `${title} note`;
  const rawExcerpt = contentLines.slice(0, 18).join("\n");

  return {
    id: `note-${slugify(relativePath.replace(/\\/g, "/").replace(/\.mdx?$/i, ""))}`,
    title,
    type: normalizeNoteType(parsed.data.type, relativePath),
    project: normalizeOptionalValue(parsed.data.project),
    tags: normalizeTags(parsed.data.tags),
    updatedAt: formatDateTime(parsed.data.date || stat.mtime.toISOString()),
    path: relativePath.replace(/\\/g, "/"),
    workspaceRootLabel: path.basename(sourceConfig.workspaceRoot),
    summary,
    highlights: bullets,
    headings,
    preview,
    rawExcerpt,
  };
}

function toExportRelativePath(sourceConfig, filePath) {
  const matchedRoot = sourceConfig.resolvedRoots.find((root) => filePath.startsWith(root.path + path.sep) || filePath === root.path);
  if (!matchedRoot) {
    return path.relative(sourceConfig.workspaceRoot, filePath);
  }

  const insideRoot = path.relative(matchedRoot.path, filePath);
  return path.join(matchedRoot.label, insideRoot);
}

function resolveWorkspaceRoot() {
  return path.resolve(
    process.env.OPENCLAW_WORKSPACE
      || process.env.WORKSPACE_ROOT
      || path.join(os.homedir(), ".openclaw", "workspace"),
  );
}

function parseList(value) {
  if (!value) return [];
  return value
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferRootLabel(rootPath) {
  const base = path.basename(rootPath);
  if (base === "obsidian-vault" || base === "docs") return base;
  return base || "notes";
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { data: {}, content: raw };
  }

  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw };
  }

  const [, frontmatter, content] = match;
  const data = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    data[key] = value;
  }

  return { data, content };
}

function normalizeTags(rawTags) {
  if (!rawTags) return [];
  return rawTags
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^['\"]|['\"]$/g, ""))
    .filter(Boolean);
}

function normalizeOptionalValue(value) {
  if (!value) return undefined;

  const normalized = value.replace(/^['\"]|['\"]$/g, "").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return undefined;
  }

  return normalized;
}

function normalizeNoteType(rawType, relativePath) {
  const normalized = rawType?.replace(/^['\"]|['\"]$/g, "").trim();
  if (normalized === "daily-chat-log" || normalized === "project-ops" || normalized === "aeyong-debug" || normalized === "weekly-review") {
    return normalized;
  }
  if (relativePath.startsWith("docs/")) return "reference";
  return "project-ops";
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date).replace(" ", " ");
}

function prettifyTitle(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
