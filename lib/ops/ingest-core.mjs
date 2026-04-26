import { promises as fs } from "fs";
import path from "path";
import os from "os";

const VALID_TASK_STATUSES = new Set(["planned", "doing", "verifying", "shipped", "blocked"]);
const VALID_NOTE_TYPES = new Set(["daily-chat-log", "project-ops", "aeyong-debug", "weekly-review", "reference"]);

export async function applyOpsIngest(input, options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const payload = normalizeIngestPayload(input, workspaceRoot);

  const tasksPath = path.join(repoRoot, "data", "ops", "tasks.json");
  const projectsPath = path.join(repoRoot, "data", "ops", "projects.json");

  const [tasks, projects] = await Promise.all([
    readJson(tasksPath),
    readJson(projectsPath),
  ]);

  const taskIndex = tasks.findIndex((task) => task.id === payload.taskId);
  if (taskIndex === -1) {
    throw new Error(`Task not found: ${payload.taskId}`);
  }

  const task = tasks[taskIndex];
  if (payload.projectId && task.projectId !== payload.projectId) {
    throw new Error(`Task ${payload.taskId} belongs to ${task.projectId}, not ${payload.projectId}`);
  }

  let noteResult = null;
  if (payload.note) {
    noteResult = await writeMirrorNote(payload.note, { workspaceRoot, task, payload });
  }

  const mergedTask = {
    ...task,
    status: payload.status || task.status,
    summary: payload.summary || task.summary,
    completedWork: mergeUnique(task.completedWork, payload.completedWork),
    nextActions: mergeUnique(task.nextActions, payload.nextActions),
    needsDecision: mergeUnique(task.needsDecision, payload.needsDecision),
    relatedDocs: mergeUnique(task.relatedDocs, [
      ...(payload.relatedDocs || []),
      ...(noteResult ? [noteResult.path] : []),
    ]),
    relatedCommits: mergeUnique(task.relatedCommits, payload.relatedCommits),
    noteIds: mergeUnique(task.noteIds, noteResult ? [noteResult.noteId] : []),
    updatedAt: nowStamp(),
  };

  tasks[taskIndex] = mergedTask;
  await writeJson(tasksPath, tasks);

  const project = projects.find((entry) => entry.id === mergedTask.projectId) || null;

  return {
    ok: true,
    appliedAt: new Date().toISOString(),
    task: mergedTask,
    project,
    note: noteResult,
    persistence: {
      repoRoot,
      workspaceRoot,
      tasksPath,
      projectsPath,
      writeStrategy: "local-json-with-optional-db-mirror",
    },
  };
}

export function createOpsIngestPayloadFromWorkResult(input, options = {}) {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const taskId = stringOrUndefined(input.taskId || input.task?.id);
  if (!taskId) {
    throw new Error("Missing taskId (or task.id) in work result input.");
  }

  const title = stringOrUndefined(input.noteTitle) || stringOrUndefined(input.title) || `Aeyong work result - ${taskId}`;
  const noteFolder = stringOrUndefined(input.noteFolder) || defaultNoteFolder(input.projectId || input.task?.projectId);
  const mirrorPath = stringOrUndefined(input.notePath)
    || path.join(noteFolder, `${datePrefix()} ${slugify(title)}.md`);

  const completedWork = normalizeStringArray(input.completedWork || input.completed || input.done);
  const nextActions = normalizeStringArray(input.nextActions || input.next || input.todo);
  const needsDecision = normalizeStringArray(input.needsDecision || input.decisionsNeeded || input.blockers);
  const evidence = normalizeStringArray(input.relatedDocs || input.evidence || input.links);
  const relatedCommits = normalizeStringArray(input.relatedCommits || input.commits);
  const summary = stringOrUndefined(input.summary) || completedWork[0] || nextActions[0] || "Aeyong structured work result";

  const noteBody = stringOrUndefined(input.noteBody) || buildMirrorMarkdown({
    title,
    source: stringOrUndefined(input.source) || "aeyong",
    taskId,
    projectId: stringOrUndefined(input.projectId || input.task?.projectId),
    summary,
    completedWork,
    nextActions,
    needsDecision,
    evidence,
  });

  return normalizeIngestPayload({
    source: stringOrUndefined(input.source) || "aeyong",
    taskId,
    projectId: stringOrUndefined(input.projectId || input.task?.projectId),
    status: stringOrUndefined(input.status),
    summary,
    completedWork,
    nextActions,
    needsDecision,
    relatedDocs: evidence,
    relatedCommits,
    note: {
      title,
      path: mirrorPath,
      body: noteBody,
      tags: normalizeStringArray(input.tags).length ? normalizeStringArray(input.tags) : ["aeyong", "ops-ingest"],
      type: stringOrUndefined(input.noteType) || "daily-chat-log",
      project: stringOrUndefined(input.projectId || input.task?.projectId),
    },
  }, workspaceRoot);
}

function normalizeIngestPayload(input, workspaceRoot) {
  if (!input || typeof input !== "object") {
    throw new Error("Ingest payload must be an object.");
  }

  const taskId = stringOrUndefined(input.taskId);
  if (!taskId) throw new Error("taskId is required.");

  const status = stringOrUndefined(input.status);
  if (status && !VALID_TASK_STATUSES.has(status)) {
    throw new Error(`Invalid task status: ${status}`);
  }

  let note;
  if (input.note) {
    const rawNote = input.note;
    const noteType = stringOrUndefined(rawNote.type) || "daily-chat-log";
    if (!VALID_NOTE_TYPES.has(noteType)) {
      throw new Error(`Invalid note type: ${noteType}`);
    }

    const noteBody = stringOrUndefined(rawNote.body);
    if (!noteBody) throw new Error("note.body is required when note is provided.");

    const requestedPath = stringOrUndefined(rawNote.path);
    note = {
      title: stringOrUndefined(rawNote.title) || `Aeyong work result - ${taskId}`,
      type: noteType,
      project: stringOrUndefined(rawNote.project) || stringOrUndefined(input.projectId),
      tags: normalizeStringArray(rawNote.tags),
      path: normalizeMirrorPath(requestedPath || path.join(defaultNoteFolder(rawNote.project || input.projectId), `${datePrefix()} ${slugify(rawNote.title || taskId)}.md`)),
      body: noteBody.trim() + "\n",
      absolutePath: path.join(workspaceRoot, normalizeMirrorPath(requestedPath || path.join(defaultNoteFolder(rawNote.project || input.projectId), `${datePrefix()} ${slugify(rawNote.title || taskId)}.md`))),
    };
  }

  return {
    source: stringOrUndefined(input.source) || "aeyong",
    taskId,
    projectId: stringOrUndefined(input.projectId),
    status,
    summary: stringOrUndefined(input.summary),
    completedWork: normalizeStringArray(input.completedWork),
    nextActions: normalizeStringArray(input.nextActions),
    needsDecision: normalizeStringArray(input.needsDecision),
    relatedDocs: normalizeStringArray(input.relatedDocs),
    relatedCommits: normalizeStringArray(input.relatedCommits),
    note,
  };
}

async function writeMirrorNote(note, context) {
  const finalBody = ensureFrontmatter(note, context);
  await fs.mkdir(path.dirname(note.absolutePath), { recursive: true });
  await fs.writeFile(note.absolutePath, finalBody, "utf8");

  const stat = await fs.stat(note.absolutePath);
  const parsed = summarizeNoteBody(finalBody);
  const normalizedPath = note.path.replace(/\\/g, "/");

  return {
    id: buildNoteId(note.path),
    noteId: buildNoteId(note.path),
    title: note.title,
    type: note.type,
    project: note.project || context.task.projectId || context.payload.projectId || undefined,
    path: normalizedPath,
    absolutePath: note.absolutePath,
    tags: note.tags?.length ? note.tags : ["aeyong", "ops-ingest"],
    updatedAt: formatDateTime(stat.mtime.toISOString()),
    workspaceRootLabel: path.basename(context.workspaceRoot),
    folder: path.posix.dirname(normalizedPath) || "(root)",
    links: parsed.links,
    summary: parsed.summary,
    highlights: parsed.highlights,
    headings: parsed.headings,
    preview: parsed.preview,
    rawExcerpt: parsed.rawExcerpt,
  };
}

function ensureFrontmatter(note, context) {
  if (note.body.startsWith("---")) {
    return note.body;
  }

  const tags = note.tags?.length ? `[${note.tags.join(", ")}]` : "[aeyong, ops-ingest]";
  const project = note.project || context.task.projectId || context.payload.projectId || "";

  return [
    "---",
    `type: ${note.type}`,
    project ? `project: ${project}` : null,
    `taskId: ${context.task.id}`,
    `source: ${context.payload.source}`,
    `tags: ${tags}`,
    "---",
    "",
    note.body.trimEnd(),
    "",
  ].filter(Boolean).join("\n");
}

function summarizeNoteBody(raw) {
  const content = parseFrontmatter(raw).content.trim();
  const contentLines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headings = contentLines.filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, "").trim()).slice(0, 6);
  const highlights = contentLines.filter((line) => /^[-*]\s+/.test(line)).map((line) => line.replace(/^[-*]\s+/, "").trim()).slice(0, 5);
  const preview = contentLines.filter((line) => !line.startsWith("#") && !/^[-*]\s+/.test(line)).slice(0, 4);
  const summary = preview[0] || highlights[0] || headings[0] || "Aeyong work result note";
  const rawExcerpt = contentLines.slice(0, 18).join("\n");

  return {
    headings,
    highlights,
    preview,
    summary,
    rawExcerpt,
    links: extractLinks(raw),
  };
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { data: {}, content: raw };
  }

  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw };
  }

  return { data: {}, content: match[2] };
}

function buildMirrorMarkdown({ title, source, taskId, projectId, summary, completedWork, nextActions, needsDecision, evidence }) {
  return [
    `# ${title}`,
    "",
    `- source: ${source}`,
    `- taskId: ${taskId}`,
    projectId ? `- projectId: ${projectId}` : null,
    summary ? `- summary: ${summary}` : null,
    "",
    "## Completed work",
    ...(completedWork.length ? completedWork.map((item) => `- ${item}`) : ["- (none recorded)"]),
    "",
    "## Next actions",
    ...(nextActions.length ? nextActions.map((item) => `- ${item}`) : ["- (none recorded)"]),
    "",
    "## Needs decision",
    ...(needsDecision.length ? needsDecision.map((item) => `- ${item}`) : ["- (none recorded)"]),
    "",
    "## Evidence",
    ...(evidence.length ? evidence.map((item) => `- ${item}`) : ["- (none recorded)"]),
    "",
  ].filter(Boolean).join("\n");
}

function buildNoteId(relativePath) {
  const normalizedPath = normalizeMirrorPath(relativePath);
  return `note-${slugify(normalizedPath.replace(/\.mdx?$/i, ""))}`;
}

function resolveWorkspaceRoot(explicit) {
  return path.resolve(
    explicit
      || process.env.PORTFOLIO_OPS_WORKSPACE_ROOT
      || process.env.OPENCLAW_WORKSPACE
      || process.env.WORKSPACE_ROOT
      || path.join(os.homedir(), ".openclaw", "workspace"),
  );
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function mergeUnique(current = [], additions = []) {
  return [...new Set([...(current || []), ...(additions || [])].map((item) => String(item).trim()).filter(Boolean))];
}

export function normalizeStringArray(value) {
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function stringOrUndefined(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeMirrorPath(value) {
  return value.replace(/^\/+/, "").replace(/\\/g, "/");
}

function defaultNoteFolder(projectId) {
  if (projectId === "portfolio") return "02 Projects";
  return "01 Daily Notes";
}

function datePrefix() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractLinks(raw) {
  const links = new Set();
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

function nowStamp() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date()).replace("T", " ");
}
