import path from "path";
import type { NoteItem, WorklogRecord } from "@/lib/ops/types";

const WORKLOG_ROOT_PREFIX = "obsidian-vault/01 Worklog/";

export function extractWorklogRecords(notes: NoteItem[]): WorklogRecord[] {
  return notes
    .map((note) => toWorklogRecord(note))
    .filter((record): record is WorklogRecord => Boolean(record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function isWorklogPath(notePath: string) {
  return notePath.replace(/\\/g, "/").startsWith(WORKLOG_ROOT_PREFIX);
}

function toWorklogRecord(note: NoteItem): WorklogRecord | null {
  if (!isWorklogPath(note.path)) return null;

  const frontmatter = note.frontmatter || {};
  const status = normalizeStatus(frontmatter.status);
  const actor = frontmatter.actor || frontmatter.agent || inferActor(note);

  return {
    id: note.id,
    noteId: note.id,
    title: note.title,
    path: note.path,
    project: note.project || frontmatter.project,
    actor,
    repo: frontmatter.repo || frontmatter.repository,
    branch: frontmatter.branch,
    status,
    summary: note.summary,
    sourceMachine: frontmatter.source_machine || frontmatter.sourceMachine,
    sessionId: frontmatter.session_id || frontmatter.sessionId,
    runId: frontmatter.run_id || frontmatter.runId,
    startedAt: frontmatter.started_at || frontmatter.startedAt,
    finishedAt: frontmatter.finished_at || frontmatter.finishedAt || frontmatter.ended_at || frontmatter.endedAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    highlights: note.highlights,
    decisions: note.highlights.filter((line) => /decid|판단|결정/i.test(line)).slice(0, 3),
    blockers: note.highlights.filter((line) => /block|risk|문제|막힘/i.test(line)).slice(0, 3),
    nextActions: note.highlights.filter((line) => /next|todo|follow|다음/i.test(line)).slice(0, 3),
  };
}

function inferActor(note: NoteItem) {
  const pathLower = note.path.toLowerCase();
  if (pathLower.includes("codex")) return "codex";
  if (pathLower.includes("claude")) return "claude";
  if (pathLower.includes("gemini")) return "gemini";
  if (pathLower.includes("openclaw")) return "openclaw";
  return note.tags[0] || "ai";
}

function normalizeStatus(value?: string): WorklogRecord["status"] {
  const normalized = value?.replace(/^["']|["']$/g, "").trim().toLowerCase();
  if (normalized === "planned" || normalized === "running" || normalized === "completed" || normalized === "blocked") {
    return normalized;
  }
  return "completed";
}

export function worklogStorageConventions() {
  return {
    root: WORKLOG_ROOT_PREFIX,
    dailyFolderExample: path.posix.join("obsidian-vault", "01 Worklog", "2026", "04", "12"),
    fileExample: path.posix.join("obsidian-vault", "01 Worklog", "2026", "04", "12", "2026-04-12-1327-codex-portfolio-ops.md"),
  };
}
