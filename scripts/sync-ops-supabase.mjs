#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const projectsPath = path.join(repoRoot, "data", "ops", "projects.json");
const tasksPath = path.join(repoRoot, "data", "ops", "tasks.json");

async function main() {
  const supabase = getSupabaseAdminClient();
  const sourceConfig = await resolveSourceConfig();
  const [projects, tasks, notes] = await Promise.all([
    readJson(projectsPath),
    readJson(tasksPath),
    loadNotes(sourceConfig),
  ]);

  await insertSyncRun(supabase, {
    status: "started",
    projects_count: projects.length,
    tasks_count: tasks.length,
    notes_count: notes.length,
    message: "Starting Portfolio /ops sync",
  });

  try {
    await upsertProjects(supabase, projects);
    await upsertTasks(supabase, tasks);
    await upsertNotes(supabase, notes);
    await upsertSyncState(supabase, sourceConfig, notes.length);

    await insertSyncRun(supabase, {
      status: "succeeded",
      projects_count: projects.length,
      tasks_count: tasks.length,
      notes_count: notes.length,
      message: "Portfolio /ops sync finished",
    });
  } catch (error) {
    await insertSyncRun(supabase, {
      status: "failed",
      projects_count: projects.length,
      tasks_count: tasks.length,
      notes_count: notes.length,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  console.log(`Synced ${projects.length} projects, ${tasks.length} tasks, ${notes.length} notes to Supabase.`);
}

function getSupabaseAdminClient() {
  const url = process.env.PORTFOLIO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing PORTFOLIO_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function upsertProjects(supabase, projects) {
  const rows = projects.map((project) => ({
    id: project.id,
    name: project.name,
    stage: project.stage,
    summary: project.summary,
    repo: project.repo ?? null,
    branch: project.branch ?? null,
    deploy_url: project.deployUrl ?? null,
    docs: project.docs ?? [],
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("ops_projects").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertTasks(supabase, tasks) {
  const rows = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    project_id: task.projectId,
    category: task.category,
    status: task.status,
    summary: task.summary,
    completed_work: task.completedWork ?? [],
    next_actions: task.nextActions ?? [],
    related_docs: task.relatedDocs ?? [],
    related_commits: task.relatedCommits ?? [],
    note_ids: task.noteIds ?? [],
    needs_decision: task.needsDecision ?? [],
    updated_at: task.updatedAt,
  }));

  const { error } = await supabase.from("ops_tasks").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertNotes(supabase, notes) {
  const rows = notes.map((note) => ({
    id: note.id,
    title: note.title,
    type: note.type,
    project: note.project ?? null,
    tags: note.tags ?? [],
    updated_at: note.updatedAt,
    path: note.path,
    workspace_root_label: note.workspaceRootLabel,
    summary: note.summary,
    highlights: note.highlights ?? [],
    headings: note.headings ?? [],
    preview: note.preview ?? [],
    raw_excerpt: note.rawExcerpt,
  }));

  const { error } = await supabase.from("ops_notes").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertSyncState(supabase, sourceConfig, notesCount) {
  const generatedAt = new Date().toISOString();
  const rows = [
    { key: "generated_at", value: generatedAt },
    { key: "workspace_root", value: sourceConfig.workspaceRoot },
    { key: "notes_roots", value: JSON.stringify(sourceConfig.roots) },
    { key: "resolved_roots", value: JSON.stringify(sourceConfig.resolvedRoots) },
    { key: "notes_count", value: String(notesCount) },
  ].map((row) => ({ ...row, updated_at: generatedAt }));

  const { error } = await supabase.from("ops_sync_state").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

async function insertSyncRun(supabase, row) {
  const { error } = await supabase.from("ops_sync_runs").insert(row);
  if (error) throw error;
}

const DEFAULT_SOURCE_CONFIG = {
  workspaceRoot: resolveWorkspaceRoot(),
  roots: ["obsidian-vault", "docs"],
};

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
      // ignore missing roots
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
  const notes = await Promise.all(uniqueFiles.map((filePath) => buildNoteItem(sourceConfig, filePath)));

  return notes.filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function collectMarkdownFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(entryPath);
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
  const bullets = contentLines.filter((line) => /^[-*]\s+/.test(line)).map((line) => line.replace(/^[-*]\s+/, "").trim()).slice(0, 5);
  const preview = contentLines.filter((line) => !line.startsWith("#") && !/^[-*]\s+/.test(line)).slice(0, 4);

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
  if (!matchedRoot) return path.relative(sourceConfig.workspaceRoot, filePath);
  return path.join(matchedRoot.label, path.relative(matchedRoot.path, filePath));
}

function resolveWorkspaceRoot() {
  return path.resolve(process.env.OPENCLAW_WORKSPACE || process.env.WORKSPACE_ROOT || path.join(os.homedir(), ".openclaw", "workspace"));
}

function parseList(value) {
  if (!value) return [];
  return value.split(path.delimiter).map((item) => item.trim()).filter(Boolean);
}

function inferRootLabel(rootPath) {
  const base = path.basename(rootPath);
  if (base === "obsidian-vault" || base === "docs") return base;
  return base || "notes";
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, content: raw };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

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
  return rawTags.replace(/^\[/, "").replace(/\]$/, "").split(",").map((tag) => tag.trim().replace(/^[\'\"]|[\'\"]$/g, "")).filter(Boolean);
}

function normalizeOptionalValue(value) {
  if (!value) return undefined;
  const normalized = value.replace(/^[\'\"]|[\'\"]$/g, "").trim();
  return !normalized || normalized === "undefined" || normalized === "null" ? undefined : normalized;
}

function normalizeNoteType(rawType, relativePath) {
  const normalized = rawType?.replace(/^[\'\"]|[\'\"]$/g, "").trim();
  if (["daily-chat-log", "project-ops", "aeyong-debug", "weekly-review"].includes(normalized)) return normalized;
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
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
