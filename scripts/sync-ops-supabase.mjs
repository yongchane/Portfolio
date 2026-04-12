#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const projectsPath = path.join(repoRoot, "data", "ops", "projects.json");
const tasksPath = path.join(repoRoot, "data", "ops", "tasks.json");
const ENV_FILES = [
  ".env.local",
  ".env.development.local",
  ".env.development",
  ".env",
];

async function main() {
  await loadLocalEnvFiles();

  const supabase = getSupabaseAdminClient();
  const sourceConfig = await resolveSourceConfig();
  const [projects, tasks, notes] = await Promise.all([
    readJson(projectsPath),
    readJson(tasksPath),
    loadNotes(sourceConfig),
  ]);
  const worklogs = extractWorklogRecords(notes);

  await insertSyncRun(supabase, {
    status: "started",
    projects_count: projects.length,
    tasks_count: tasks.length,
    notes_count: notes.length,
    message: `Starting Portfolio /ops sync (${worklogs.length} worklogs)`,
  });

  try {
    await upsertProjects(supabase, projects);
    await upsertTasks(supabase, tasks);
    await upsertNotes(supabase, notes);
    await upsertWorklogs(supabase, worklogs);
    await upsertSyncState(supabase, sourceConfig, notes.length, worklogs);

    await insertSyncRun(supabase, {
      status: "succeeded",
      projects_count: projects.length,
      tasks_count: tasks.length,
      notes_count: notes.length,
      message: `Portfolio /ops sync finished (${worklogs.length} worklogs)`,
    });
  } catch (error) {
    await insertSyncRun(supabase, {
      status: "failed",
      projects_count: projects.length,
      tasks_count: tasks.length,
      notes_count: notes.length,
      message: error instanceof Error ? `${error.message} (${worklogs.length} worklogs queued)` : String(error),
    });
    throw error;
  }

  console.log(
    `Synced ${projects.length} projects, ${tasks.length} tasks, ${notes.length} notes, ${worklogs.length} worklogs to Supabase.`,
  );
}

function getSupabaseAdminClient() {
  const url =
    process.env.PORTFOLIO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing PORTFOLIO_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
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

async function loadLocalEnvFiles() {
  for (const fileName of ENV_FILES) {
    const filePath = path.join(repoRoot, fileName);

    try {
      const contents = await fs.readFile(filePath, "utf8");
      applyEnvFile(contents);
    } catch {
      // ignore missing env files
    }
  }
}

function applyEnvFile(contents) {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    let key = trimmed.slice(0, equalsIndex).trim();
    if (key.startsWith("export ")) {
      key = key.slice("export ".length).trim();
    }

    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
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
    sectors: project.sectors ?? [],
    checklist: project.checklist ?? [],
    operating_cadence: project.operatingCadence ?? [],
    admin_surfaces: project.adminSurfaces ?? [],
    vault_views: project.vaultViews ?? [],
    github_focus: project.githubFocus ?? [],
    updated_at: new Date().toISOString(),
  }));

  await upsertRowsWithSchemaFallback(supabase, "ops_projects", rows, "id");
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

  await upsertRowsWithSchemaFallback(supabase, "ops_tasks", rows, "id");
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
    links: note.links ?? [],
    raw_excerpt: note.rawExcerpt,
  }));

  await upsertRowsWithSchemaFallback(supabase, "ops_notes", rows, "id");
}

async function upsertWorklogs(supabase, worklogs) {
  const rows = worklogs.map((worklog) => ({
    id: worklog.id,
    note_id: worklog.noteId,
    title: worklog.title,
    path: worklog.path,
    project: worklog.project ?? null,
    actor: worklog.actor,
    repo: worklog.repo ?? null,
    branch: worklog.branch ?? null,
    status: worklog.status,
    summary: worklog.summary,
    source_machine: worklog.sourceMachine ?? null,
    session_id: worklog.sessionId ?? null,
    run_id: worklog.runId ?? null,
    started_at: worklog.startedAt ?? null,
    finished_at: worklog.finishedAt ?? null,
    updated_at: worklog.updatedAt,
    tags: worklog.tags ?? [],
    highlights: worklog.highlights ?? [],
    decisions: worklog.decisions ?? [],
    blockers: worklog.blockers ?? [],
    next_actions: worklog.nextActions ?? [],
  }));

  await upsertRowsWithSchemaFallback(supabase, "ops_worklogs", rows, "id");
}

async function upsertSyncState(supabase, sourceConfig, notesCount, worklogs) {
  const generatedAt = new Date().toISOString();
  const rows = [
    { key: "generated_at", value: generatedAt },
    { key: "workspace_root", value: sourceConfig.workspaceRoot },
    { key: "notes_roots", value: JSON.stringify(sourceConfig.roots) },
    {
      key: "resolved_roots",
      value: JSON.stringify(sourceConfig.resolvedRoots),
    },
    { key: "notes_count", value: String(notesCount) },
    { key: "worklogs_count", value: String(worklogs.length) },
    { key: "worklogs_updated_at", value: worklogs[0]?.updatedAt ?? "" },
  ].map((row) => ({ ...row, updated_at: generatedAt }));

  await upsertRowsWithSchemaFallback(supabase, "ops_sync_state", rows, "key");
}

async function insertSyncRun(supabase, row) {
  const { error } = await supabase.from("ops_sync_runs").insert(row);
  if (error) throw error;
}

async function upsertRowsWithSchemaFallback(
  supabase,
  tableName,
  rows,
  onConflict,
) {
  let candidateRows = rows.map((row) => ({ ...row }));
  const removedColumns = new Set();

  while (true) {
    const { error } = await supabase
      .from(tableName)
      .upsert(candidateRows, { onConflict });

    if (!error) return;

    const missingColumn = parseMissingColumnError(error, tableName);
    if (!missingColumn || removedColumns.has(missingColumn)) {
      throw error;
    }

    removedColumns.add(missingColumn);
    candidateRows = candidateRows.map((row) => {
      const nextRow = { ...row };
      delete nextRow[missingColumn];
      return nextRow;
    });

    console.warn(
      `Supabase table ${tableName} is missing column ${missingColumn}; retrying without that field.`,
    );
  }
}

function parseMissingColumnError(error, tableName) {
  const message = error?.message ?? String(error);
  const match = message.match(
    /Could not find the '([^']+)' column of '([^']+)' in the schema cache\.?/i,
  );

  if (!match) return null;

  const [, columnName, foundTableName] = match;
  if (foundTableName !== tableName) return null;

  return columnName;
}

function extractWorklogRecords(notes) {
  return notes
    .filter((note) => note.path.replace(/\\/g, "/").startsWith("obsidian-vault/01 Worklog/"))
    .map((note) => {
      const frontmatter = note.frontmatter || {};
      return {
        id: note.id,
        noteId: note.id,
        title: note.title,
        path: note.path,
        project: note.project ?? frontmatter.project,
        actor: frontmatter.actor || frontmatter.agent || note.tags?.[0] || "ai",
        repo: frontmatter.repo || frontmatter.repository,
        branch: frontmatter.branch,
        status: normalizeWorklogStatus(frontmatter.status),
        summary: note.summary,
        sourceMachine: frontmatter.source_machine || frontmatter.sourceMachine,
        sessionId: frontmatter.session_id || frontmatter.sessionId,
        runId: frontmatter.run_id || frontmatter.runId,
        startedAt: frontmatter.started_at || frontmatter.startedAt,
        finishedAt: frontmatter.finished_at || frontmatter.finishedAt || frontmatter.ended_at || frontmatter.endedAt,
        updatedAt: note.updatedAt,
        tags: note.tags ?? [],
        highlights: note.highlights ?? [],
        decisions: (note.highlights ?? []).filter((line) => /decid|판단|결정/i.test(line)).slice(0, 3),
        blockers: (note.highlights ?? []).filter((line) => /block|risk|문제|막힘/i.test(line)).slice(0, 3),
        nextActions: (note.highlights ?? []).filter((line) => /next|todo|follow|다음/i.test(line)).slice(0, 3),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function normalizeWorklogStatus(value) {
  const normalized = value?.replace(/^[\"']|[\"']$/g, '').trim().toLowerCase();
  if (["planned", "running", "completed", "blocked"].includes(normalized)) {
    return normalized;
  }
  return "completed";
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
    await Promise.all(
      sourceConfig.resolvedRoots.map((root) => collectMarkdownFiles(root.path)),
    )
  ).flat();

  const uniqueFiles = [
    ...new Set(markdownFiles.map((filePath) => path.resolve(filePath))),
  ];
  const notes = await Promise.all(
    uniqueFiles.map((filePath) => buildNoteItem(sourceConfig, filePath)),
  );

  return notes
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function collectMarkdownFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) return collectMarkdownFiles(entryPath);
      return /\.mdx?$/i.test(entry.name) ? [entryPath] : [];
    }),
  );

  return nested.flat();
}

async function buildNoteItem(sourceConfig, filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const stat = await fs.stat(filePath);
  const parsed = parseFrontmatter(raw);
  const content = parsed.content.trim();
  const relativePath = toExportRelativePath(sourceConfig, filePath);
  const contentLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headings = contentLines
    .filter((line) => line.startsWith("#"))
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .slice(0, 6);
  const bullets = contentLines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .slice(0, 5);
  const preview = contentLines
    .filter((line) => !line.startsWith("#") && !/^[-*]\s+/.test(line))
    .slice(0, 4);

  const title =
    headings[0] ||
    prettifyTitle(path.basename(relativePath, path.extname(relativePath)));
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
    frontmatter: parsed.data,
    links: extractLinks(raw),
    summary,
    highlights: bullets,
    headings,
    preview,
    rawExcerpt,
  };
}

function toExportRelativePath(sourceConfig, filePath) {
  const matchedRoot = sourceConfig.resolvedRoots.find(
    (root) =>
      filePath.startsWith(root.path + path.sep) || filePath === root.path,
  );
  if (!matchedRoot) return path.relative(sourceConfig.workspaceRoot, filePath);
  return path.join(
    matchedRoot.label,
    path.relative(matchedRoot.path, filePath),
  );
}

function resolveWorkspaceRoot() {
  return path.resolve(
    process.env.OPENCLAW_WORKSPACE ||
      process.env.WORKSPACE_ROOT ||
      path.join(os.homedir(), ".openclaw", "workspace"),
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
  return rawTags
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^[\'\"]|[\'\"]$/g, ""))
    .filter(Boolean);
}

function normalizeOptionalValue(value) {
  if (!value) return undefined;
  const normalized = value.replace(/^[\'\"]|[\'\"]$/g, "").trim();
  return !normalized || normalized === "undefined" || normalized === "null"
    ? undefined
    : normalized;
}

function normalizeNoteType(rawType, relativePath) {
  const normalized = rawType?.replace(/^[\'\"]|[\'\"]$/g, "").trim();
  if (
    ["daily-chat-log", "project-ops", "aeyong-debug", "weekly-review"].includes(
      normalized,
    )
  )
    return normalized;
  if (relativePath.startsWith("docs/")) return "reference";
  return "project-ops";
}

function extractLinks(raw) {
  const links = new Set();
  for (const match of raw.matchAll(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g,
  )) {
    const target = match[1]?.trim();
    if (target) links.add(target);
  }
  for (const match of raw.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1]?.trim();
    if (
      target &&
      !target.startsWith("http://") &&
      !target.startsWith("https://")
    ) {
      links.add(target.replace(/^\.\//, ""));
    }
  }
  return [...links];
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

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
