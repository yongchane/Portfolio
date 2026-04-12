import "server-only";

import { createHash, randomUUID } from "crypto";
import type { NoteType, OpsArtifactRecord, WorklogRecord } from "@/lib/ops/types";
import { getSupabaseAdminClient, isSupabaseConfigured, isSupabaseOpsAvailable } from "@/lib/ops/supabase";

type OpsIngestArtifactType = Exclude<OpsArtifactRecord["artifactType"], "worklog">;

type OpsIngestArtifactInput = {
  artifactType: OpsIngestArtifactType;
  title?: string;
  summary: string;
  highlights?: string[];
  decisions?: string[];
  learnings?: string[];
  blockers?: string[];
  nextActions?: string[];
  linkedNoteIds?: string[];
  updatedAt?: string;
};

export type OpsIngestWorklogInput = {
  id?: string;
  noteId?: string;
  title: string;
  summary: string;
  project?: string;
  actor?: string;
  repo?: string;
  branch?: string;
  status?: WorklogRecord["status"];
  sourceMachine?: string;
  sessionId?: string;
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  highlights?: string[];
  decisions?: string[];
  blockers?: string[];
  nextActions?: string[];
  noteType?: NoteType;
  notePath?: string;
  noteTitle?: string;
  noteContent?: string;
  notePreview?: string[];
  noteLinks?: string[];
  workspaceRootLabel?: string;
  artifacts?: OpsIngestArtifactInput[];
};

export type OpsIngestResult = {
  noteId: string;
  worklogId: string;
  artifactIds: string[];
  insertedArtifacts: number;
  updatedAt: string;
};

export function getOpsIngestToken() {
  return process.env.PORTFOLIO_OPS_INGEST_TOKEN?.trim() || "";
}

export async function isOpsIngestAvailable() {
  if (!isSupabaseConfigured()) return false;
  return isSupabaseOpsAvailable();
}

type MinimalSupabaseWriter = {
  from: (table: string) => {
    upsert: (values: unknown, options?: { onConflict?: string }) => Promise<{ error: Error | null }>;
    insert: (values: unknown, options?: unknown) => Promise<{ error: Error | null }>;
  };
};

export async function ingestOpsWorklog(input: OpsIngestWorklogInput): Promise<OpsIngestResult> {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase admin client is not configured.");
  }

  const available = await isSupabaseOpsAvailable();
  if (!available) {
    throw new Error("Supabase ops tables are not reachable.");
  }

  const normalized = normalizeInput(input);
  const noteRow = buildNoteRow(normalized);
  const worklogRow = buildWorklogRow(normalized, noteRow.id);
  const artifactRows = buildArtifactRows(normalized, noteRow.id, worklogRow.id);
  const syncStateRows = buildSyncStateRows(normalized.updatedAt);

  const supabase = client as unknown as MinimalSupabaseWriter;

  const noteResult = await supabase.from("ops_notes").upsert(noteRow, { onConflict: "id" });
  if (noteResult.error) throw noteResult.error;

  const worklogResult = await supabase.from("ops_worklogs").upsert(worklogRow, { onConflict: "id" });
  if (worklogResult.error) throw worklogResult.error;

  if (artifactRows.length) {
    const artifactResult = await supabase.from("ops_artifacts").upsert(artifactRows, { onConflict: "id" });
    if (artifactResult.error) throw artifactResult.error;
  }

  const syncStateResult = await supabase.from("ops_sync_state").upsert(syncStateRows, { onConflict: "key" });
  if (syncStateResult.error) throw syncStateResult.error;

  const syncRunResult = await supabase.from("ops_sync_runs").insert({
    status: "succeeded",
    source: "assistant-ingest",
    projects_count: 0,
    tasks_count: 0,
    notes_count: 1,
    message: `Assistant ingest saved ${worklogRow.id} (${artifactRows.length} artifacts)`,
  });
  if (syncRunResult.error) throw syncRunResult.error;

  return {
    noteId: noteRow.id,
    worklogId: worklogRow.id,
    artifactIds: artifactRows.map((row) => row.id),
    insertedArtifacts: artifactRows.length,
    updatedAt: normalized.updatedAt,
  };
}

function normalizeInput(input: OpsIngestWorklogInput) {
  const updatedAt = normalizeTimestamp(input.updatedAt);
  const noteId = sanitizeId(input.noteId) || deriveNoteId(input, updatedAt);
  const worklogId = sanitizeId(input.id) || noteId;
  const title = input.title.trim();
  const summary = input.summary.trim();
  if (!title) throw new Error("title is required");
  if (!summary) throw new Error("summary is required");

  return {
    ...input,
    id: worklogId,
    noteId,
    title,
    summary,
    actor: sanitizeText(input.actor) || "assistant",
    status: normalizeStatus(input.status),
    updatedAt,
    startedAt: normalizeNullableTimestamp(input.startedAt),
    finishedAt: normalizeNullableTimestamp(input.finishedAt),
    noteType: normalizeNoteType(input.noteType),
    tags: normalizeArray(input.tags),
    highlights: normalizeArray(input.highlights),
    decisions: normalizeArray(input.decisions),
    blockers: normalizeArray(input.blockers),
    nextActions: normalizeArray(input.nextActions),
    notePreview: normalizeArray(input.notePreview),
    noteLinks: normalizeArray(input.noteLinks),
    workspaceRootLabel: sanitizeText(input.workspaceRootLabel) || "assistant-runtime",
    artifacts: (input.artifacts || []).map((artifact, index) => normalizeArtifact(artifact, input.title, updatedAt, index)),
  };
}

function normalizeArtifact(artifact: OpsIngestArtifactInput, baseTitle: string, updatedAt: string, index: number) {
  if (!artifact.summary?.trim()) {
    throw new Error(`artifacts[${index}].summary is required`);
  }

  return {
    artifactType: artifact.artifactType,
    title: sanitizeText(artifact.title) || `${baseTitle} ${artifact.artifactType}`,
    summary: artifact.summary.trim(),
    highlights: normalizeArray(artifact.highlights),
    decisions: normalizeArray(artifact.decisions),
    learnings: normalizeArray(artifact.learnings),
    blockers: normalizeArray(artifact.blockers),
    nextActions: normalizeArray(artifact.nextActions),
    linkedNoteIds: normalizeArray(artifact.linkedNoteIds),
    updatedAt: normalizeTimestamp(artifact.updatedAt || updatedAt),
  };
}

function buildNoteRow(input: ReturnType<typeof normalizeInput>) {
  const generatedContent = buildNoteContent(input);
  const contentLines = generatedContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headings = contentLines.filter((line) => line.startsWith("#")).map((line) => line.replace(/^#+\s*/, "").trim()).slice(0, 6);
  const highlights = input.highlights.length ? input.highlights : contentLines.filter((line) => /^[-*]\s+/.test(line)).map((line) => line.replace(/^[-*]\s+/, "").trim()).slice(0, 5);
  const preview = input.notePreview.length ? input.notePreview : contentLines.filter((line) => !line.startsWith("#") && !/^[-*]\s+/.test(line)).slice(0, 4);

  return {
    id: input.noteId,
    title: sanitizeText(input.noteTitle) || input.title,
    type: input.noteType,
    project: sanitizeNullable(input.project),
    tags: input.tags,
    updated_at: input.updatedAt,
    path: buildNotePath(input),
    workspace_root_label: input.workspaceRootLabel,
    summary: input.summary,
    highlights,
    headings,
    preview,
    links: input.noteLinks,
    raw_excerpt: generatedContent.split(/\r?\n/).slice(0, 18).join("\n"),
  };
}

function buildWorklogRow(input: ReturnType<typeof normalizeInput>, noteId: string) {
  return {
    id: input.id,
    note_id: noteId,
    title: input.title,
    path: buildNotePath(input),
    project: sanitizeNullable(input.project),
    actor: input.actor,
    repo: sanitizeNullable(input.repo),
    branch: sanitizeNullable(input.branch),
    status: input.status,
    summary: input.summary,
    source_machine: sanitizeNullable(input.sourceMachine),
    session_id: sanitizeNullable(input.sessionId),
    run_id: sanitizeNullable(input.runId),
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    updated_at: input.updatedAt,
    tags: input.tags,
    highlights: input.highlights,
    decisions: input.decisions,
    blockers: input.blockers,
    next_actions: input.nextActions,
  };
}

function buildArtifactRows(input: ReturnType<typeof normalizeInput>, noteId: string, worklogId: string) {
  const linkedNoteIds = [noteId];
  const rows = [
    {
      id: `${worklogId}::worklog`,
      note_id: noteId,
      title: input.title,
      artifact_type: "worklog",
      project: sanitizeNullable(input.project),
      path: buildNotePath(input),
      summary: input.summary,
      actor: input.actor,
      source_machine: sanitizeNullable(input.sourceMachine),
      repo: sanitizeNullable(input.repo),
      branch: sanitizeNullable(input.branch),
      status: input.status,
      tags: input.tags,
      highlights: input.highlights,
      decisions: input.decisions,
      learnings: [],
      blockers: input.blockers,
      next_actions: input.nextActions,
      linked_note_ids: linkedNoteIds,
      updated_at: input.updatedAt,
    },
    ...input.artifacts.map((artifact, index) => ({
      id: `${worklogId}::${artifact.artifactType}:${index + 1}`,
      note_id: noteId,
      title: artifact.title,
      artifact_type: artifact.artifactType,
      project: sanitizeNullable(input.project),
      path: buildNotePath(input),
      summary: artifact.summary,
      actor: input.actor,
      source_machine: sanitizeNullable(input.sourceMachine),
      repo: sanitizeNullable(input.repo),
      branch: sanitizeNullable(input.branch),
      status: null,
      tags: input.tags,
      highlights: artifact.highlights,
      decisions: artifact.decisions,
      learnings: artifact.learnings,
      blockers: artifact.blockers,
      next_actions: artifact.nextActions,
      linked_note_ids: artifact.linkedNoteIds.length ? artifact.linkedNoteIds : linkedNoteIds,
      updated_at: artifact.updatedAt,
    })),
  ];

  return rows;
}

function buildSyncStateRows(updatedAt: string) {
  return [
    { key: "generated_at", value: updatedAt, updated_at: updatedAt },
    { key: "artifacts_updated_at", value: updatedAt, updated_at: updatedAt },
    { key: "worklogs_updated_at", value: updatedAt, updated_at: updatedAt },
  ];
}

function buildNoteContent(input: ReturnType<typeof normalizeInput>) {
  if (input.noteContent?.trim()) {
    return input.noteContent.trim();
  }

  const lines = [
    `# ${sanitizeText(input.noteTitle) || input.title}`,
    input.summary,
  ];

  if (input.highlights.length) {
    lines.push("", "## Highlights", ...input.highlights.map((item) => `- ${item}`));
  }
  if (input.decisions.length) {
    lines.push("", "## Decisions", ...input.decisions.map((item) => `- ${item}`));
  }
  if (input.blockers.length) {
    lines.push("", "## Blockers", ...input.blockers.map((item) => `- ${item}`));
  }
  if (input.nextActions.length) {
    lines.push("", "## Next actions", ...input.nextActions.map((item) => `- ${item}`));
  }

  return lines.join("\n");
}

function buildNotePath(input: ReturnType<typeof normalizeInput>) {
  if (input.notePath?.trim()) return input.notePath.trim().replace(/\\/g, "/");

  const date = new Date(input.updatedAt);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const slug = slugify(`${input.actor}-${input.project || input.repo || input.title}`) || "assistant-worklog";
  return `obsidian-vault/01 Worklog/${year}/${month}/${day}/${year}-${month}-${day}-${slug}.md`;
}

function deriveNoteId(input: OpsIngestWorklogInput, updatedAt: string) {
  const seed = [input.sessionId, input.runId, input.title, updatedAt].filter(Boolean).join("::") || randomUUID();
  return `note-runtime-${createHash("sha1").update(seed).digest("hex").slice(0, 16)}`;
}

function normalizeStatus(value?: WorklogRecord["status"]) {
  return value && ["planned", "running", "completed", "blocked"].includes(value) ? value : "completed";
}

function normalizeNoteType(value?: NoteType): NoteType {
  return value && ["daily-chat-log", "project-ops", "aeyong-debug", "weekly-review", "reference"].includes(value)
    ? value
    : "project-ops";
}

function normalizeArray(value?: string[]) {
  return Array.from(new Set((value || []).map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

function normalizeTimestamp(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return date.toISOString();
}

function normalizeNullableTimestamp(value?: string) {
  if (!value) return null;
  return normalizeTimestamp(value);
}

function sanitizeText(value?: string) {
  return value?.trim() || "";
}

function sanitizeNullable(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeId(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, "-") : "";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
