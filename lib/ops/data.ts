import { promises as fs } from "fs";
import os from "os";
import path from "path";
import projectsData from "@/data/ops/projects.json";
import tasksData from "@/data/ops/tasks.json";
import type { NoteItem, NoteType, OpsConsoleData, Project, Task } from "@/lib/ops/types";

const projects = projectsData as Project[];
const tasks = tasksData as Task[];

const NOTE_SCAN_ROOT_NAMES = ["obsidian-vault", "docs"] as const;
const WORKSPACE_MARKERS = ["AGENTS.md", ...NOTE_SCAN_ROOT_NAMES] as const;

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  const workspaceResolution = await findWorkspaceRoot();
  const noteRoots = workspaceResolution.root
    ? NOTE_SCAN_ROOT_NAMES.map((rootName) => path.join(workspaceResolution.root!, rootName))
    : [];
  const notes = workspaceResolution.root ? await loadNotes(workspaceResolution.root) : [];

  return {
    projects,
    tasks,
    notes,
    dataSource: {
      workspaceRoot: workspaceResolution.root,
      notesRoots: noteRoots.length ? noteRoots : NOTE_SCAN_ROOT_NAMES.map((root) => root),
      attemptedWorkspaceRoots: workspaceResolution.attemptedRoots,
      notesCount: notes.length,
    },
  };
}

async function findWorkspaceRoot() {
  const attemptedRoots: string[] = [];

  for (const candidate of getWorkspaceRootCandidates()) {
    const normalizedCandidate = path.resolve(candidate);
    if (attemptedRoots.includes(normalizedCandidate)) continue;
    attemptedRoots.push(normalizedCandidate);

    if (await looksLikeWorkspaceRoot(normalizedCandidate)) {
      return {
        root: normalizedCandidate,
        attemptedRoots,
      };
    }
  }

  return {
    root: undefined,
    attemptedRoots,
  };
}

function getWorkspaceRootCandidates() {
  const rawCandidates = [
    process.env.OPENCLAW_WORKSPACE,
    process.env.PORTFOLIO_OPS_WORKSPACE,
    path.join(os.homedir(), ".openclaw", "workspace"),
    "/Users/hyeon-yongchan/.openclaw/workspace",
    ...expandAncestors(process.cwd()),
  ].filter(Boolean) as string[];

  return rawCandidates;
}

function expandAncestors(start: string) {
  const visited = new Set<string>();
  const ancestors: string[] = [];
  let current = path.resolve(start);

  while (!visited.has(current)) {
    visited.add(current);
    ancestors.push(current, path.join(current, ".openclaw", "workspace"));

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return ancestors;
}

async function looksLikeWorkspaceRoot(candidate: string) {
  try {
    const stat = await fs.stat(candidate);
    if (!stat.isDirectory()) return false;
  } catch {
    return false;
  }

  const markerChecks = await Promise.all(
    WORKSPACE_MARKERS.map(async (marker) => {
      try {
        await fs.access(path.join(candidate, marker));
        return true;
      } catch {
        return false;
      }
    }),
  );

  return markerChecks.some(Boolean);
}

async function loadNotes(workspaceRoot: string): Promise<NoteItem[]> {
  const markdownFiles = (
    await Promise.all(
      NOTE_SCAN_ROOT_NAMES.map((root) => collectMarkdownFiles(path.join(workspaceRoot, root))),
    )
  ).flat();

  const uniqueFiles = [...new Set(markdownFiles.map((filePath) => path.resolve(filePath)))];
  const notes = await Promise.all(uniqueFiles.map((filePath) => buildNoteItem(workspaceRoot, filePath)));

  return notes
    .filter((note): note is NoteItem => Boolean(note))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(entryPath);
    }
    return /\.mdx?$/i.test(entry.name) ? [entryPath] : [];
  }));

  return nested.flat();
}

async function buildNoteItem(workspaceRoot: string, filePath: string): Promise<NoteItem | null> {
  const raw = await fs.readFile(filePath, "utf8");
  const stat = await fs.stat(filePath);
  const relativePath = path.relative(workspaceRoot, filePath);
  const parsed = parseFrontmatter(raw);
  const content = parsed.content.trim();
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
    project: parsed.data.project,
    tags: normalizeTags(parsed.data.tags),
    updatedAt: formatDateTime(parsed.data.date || stat.mtime.toISOString()),
    path: relativePath.replace(/\\/g, "/"),
    workspaceRootLabel: path.basename(workspaceRoot),
    summary,
    highlights: bullets,
    headings,
    preview,
    rawExcerpt,
  };
}

function parseFrontmatter(raw: string) {
  if (!raw.startsWith("---")) {
    return { data: {} as Record<string, string>, content: raw };
  }

  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
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
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeNoteType(rawType: string | undefined, relativePath: string): NoteType {
  const normalized = rawType?.replace(/^['\"]|['\"]$/g, "").trim();
  if (normalized === "daily-chat-log" || normalized === "project-ops" || normalized === "aeyong-debug" || normalized === "weekly-review") {
    return normalized;
  }
  if (relativePath.startsWith("docs/")) return "reference";
  return "project-ops";
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
