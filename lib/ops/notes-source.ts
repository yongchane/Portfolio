import { promises as fs } from "fs";
import path from "path";
import os from "os";
import notesExport from "@/data/ops/notes-export.json";
import type { ExportSourceRoot, NoteItem, NoteType } from "@/lib/ops/types";

type ExportPayload = typeof notesExport;

type NotesSourceData = {
  mode: "live" | "export";
  generatedAt: string;
  workspaceRoot?: string;
  notesRoots: string[];
  resolvedRoots: ExportSourceRoot[];
  notes: NoteItem[];
};

const bundledExport = notesExport as ExportPayload;

export async function getNotesSourceData(): Promise<NotesSourceData> {
  const liveConfig = await resolveLiveSourceConfig();
  if (liveConfig.resolvedRoots.length > 0) {
    const notes = await loadNotes(liveConfig);
    return {
      mode: "live",
      generatedAt: new Date().toISOString(),
      workspaceRoot: liveConfig.workspaceRoot,
      notesRoots: liveConfig.roots,
      resolvedRoots: liveConfig.resolvedRoots,
      notes,
    };
  }

  return {
    mode: "export",
    generatedAt: bundledExport.generatedAt,
    workspaceRoot: bundledExport.source.workspaceRoot,
    notesRoots: bundledExport.source.roots,
    resolvedRoots: bundledExport.source.resolvedRoots,
    notes: bundledExport.notes as NoteItem[],
  };
}

async function resolveLiveSourceConfig() {
  const explicitRoots = parseList(process.env.PORTFOLIO_OPS_NOTE_ROOTS);
  const workspaceRoot = process.env.PORTFOLIO_OPS_WORKSPACE_ROOT
    ? path.resolve(process.env.PORTFOLIO_OPS_WORKSPACE_ROOT)
    : resolveWorkspaceRoot();

  const requestedRoots = explicitRoots.length > 0
    ? explicitRoots.map((rootPath) => ({
        label: inferRootLabel(rootPath),
        path: path.resolve(rootPath),
      }))
    : ["obsidian-vault", "docs"].map((rootName) => ({
        label: rootName,
        path: path.join(workspaceRoot, rootName),
      }));

  const resolvedRoots: ExportSourceRoot[] = [];
  for (const root of requestedRoots) {
    try {
      const stat = await fs.stat(root.path);
      if (stat.isDirectory()) {
        resolvedRoots.push(root);
      }
    } catch {
      // Missing local roots are allowed. We fall back to bundled export.
    }
  }

  return {
    workspaceRoot,
    roots: requestedRoots.map((root) => root.label),
    resolvedRoots,
  };
}

async function loadNotes(sourceConfig: { workspaceRoot: string; resolvedRoots: ExportSourceRoot[] }) {
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

async function collectMarkdownFiles(rootPath: string): Promise<string[]> {
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

async function buildNoteItem(sourceConfig: { workspaceRoot: string; resolvedRoots: ExportSourceRoot[] }, filePath: string): Promise<NoteItem> {
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

  const normalizedPath = relativePath.replace(/\\/g, "/");
  return {
    id: `note-${slugify(normalizedPath.replace(/\.mdx?$/i, ""))}`,
    title,
    type: normalizeNoteType(parsed.data.type, relativePath),
    project: normalizeOptionalValue(parsed.data.project),
    tags: normalizeTags(parsed.data.tags),
    updatedAt: formatDateTime(parsed.data.date || stat.mtime.toISOString()),
    path: normalizedPath,
    workspaceRootLabel: path.basename(sourceConfig.workspaceRoot),
    folder: path.posix.dirname(normalizedPath),
    frontmatter: parsed.data,
    links: extractLinks(raw),
    summary,
    highlights: bullets,
    headings,
    preview,
    rawExcerpt,
  };
}

function toExportRelativePath(sourceConfig: { workspaceRoot: string; resolvedRoots: ExportSourceRoot[] }, filePath: string) {
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

function parseList(value?: string) {
  if (!value) return [];
  return value
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferRootLabel(rootPath: string) {
  const base = path.basename(rootPath);
  if (base === "obsidian-vault" || base === "docs") return base;
  return base || "notes";
}

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---")) {
    return { data: {} as Record<string, string>, content: raw };
  }

  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {} as Record<string, string>, content: raw };
  }

  const [, frontmatter, content] = match;
  const data: Record<string, string> = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    data[key] = value;
  }

  return { data, content };
}

function normalizeTags(rawTags?: string) {
  if (!rawTags) return [];
  return rawTags
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^['\"]|['\"]$/g, ""))
    .filter(Boolean);
}

function normalizeOptionalValue(value?: string) {
  if (!value) return undefined;

  const normalized = value.replace(/^['\"]|['\"]$/g, "").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return undefined;
  }

  return normalized;
}

function normalizeNoteType(rawType: string | undefined, relativePath: string): NoteType {
  const normalized = rawType?.replace(/^['\"]|['\"]$/g, "").trim();
  if (normalized === "daily-chat-log" || normalized === "project-ops" || normalized === "aeyong-debug" || normalized === "weekly-review") {
    return normalized;
  }
  if (relativePath.startsWith("docs/")) return "reference";
  return "project-ops";
}

function extractLinks(raw: string) {
  const links = new Set<string>();
  for (const match of raw.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    const target = match[1]?.trim();
    if (target) links.add(target);
  }
  for (const match of raw.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1]?.trim();
    if (target && !target.startsWith("http://") && !target.startsWith("https://")) {
      links.add(target.replace(/^\.\//, ""));
    }
  }
  return [...links];
}

function formatDateTime(value: string) {
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

function prettifyTitle(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
