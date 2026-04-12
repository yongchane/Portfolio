import type { NoteItem, OpsArtifactRecord, OpsArtifactType, WorklogRecord } from "@/lib/ops/types";
import { extractWorklogRecords, isWorklogPath } from "@/lib/ops/worklog";

const DECISION_PATTERN = /decid|decision|판단|결정/i;
const LEARNING_PATTERN = /learn|lesson|insight|realiz|배운|학습|교훈|인사이트/i;
const BLOCKER_PATTERN = /block|risk|issue|문제|막힘/i;
const NEXT_ACTION_PATTERN = /next|todo|follow|action|다음/i;

export function extractArtifactRecords(notes: NoteItem[]): OpsArtifactRecord[] {
  const worklogs = extractWorklogRecords(notes);
  const worklogArtifacts = worklogs.map((worklog) => toWorklogArtifact(worklog));
  const derivedArtifacts = notes.flatMap((note) => deriveArtifactsFromNote(note));

  return [...worklogArtifacts, ...derivedArtifacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function toWorklogArtifact(worklog: WorklogRecord): OpsArtifactRecord {
  return {
    id: `${worklog.id}::worklog`,
    noteId: worklog.noteId,
    title: worklog.title,
    artifactType: "worklog",
    project: worklog.project,
    path: worklog.path,
    summary: worklog.summary,
    actor: worklog.actor,
    sourceMachine: worklog.sourceMachine,
    repo: worklog.repo,
    branch: worklog.branch,
    status: worklog.status,
    tags: worklog.tags,
    highlights: worklog.highlights,
    decisions: worklog.decisions,
    learnings: [],
    blockers: worklog.blockers,
    nextActions: worklog.nextActions,
    linkedNoteIds: [worklog.noteId],
    updatedAt: worklog.updatedAt,
  };
}

function deriveArtifactsFromNote(note: NoteItem): OpsArtifactRecord[] {
  const lines = collectSignalLines(note);
  const decisions = unique(lines.filter((line) => DECISION_PATTERN.test(line))).slice(0, 4);
  const learnings = unique(lines.filter((line) => LEARNING_PATTERN.test(line))).slice(0, 4);
  const blockers = unique(lines.filter((line) => BLOCKER_PATTERN.test(line))).slice(0, 3);
  const nextActions = unique(lines.filter((line) => NEXT_ACTION_PATTERN.test(line))).slice(0, 3);
  const actor = inferActor(note);

  const artifacts: OpsArtifactRecord[] = [];
  if (decisions.length) {
    artifacts.push({
      id: `${note.id}::decision`,
      noteId: note.id,
      title: `${note.title} decision`,
      artifactType: "decision",
      project: note.project,
      path: note.path,
      summary: decisions[0],
      actor,
      status: isWorklogPath(note.path) ? "completed" : undefined,
      tags: note.tags,
      highlights: decisions,
      decisions,
      learnings: [],
      blockers,
      nextActions,
      linkedNoteIds: [note.id],
      updatedAt: note.updatedAt,
    });
  }

  if (learnings.length) {
    artifacts.push({
      id: `${note.id}::learning`,
      noteId: note.id,
      title: `${note.title} learning`,
      artifactType: "learning",
      project: note.project,
      path: note.path,
      summary: learnings[0],
      actor,
      status: isWorklogPath(note.path) ? "completed" : undefined,
      tags: note.tags,
      highlights: learnings,
      decisions: [],
      learnings,
      blockers,
      nextActions,
      linkedNoteIds: [note.id],
      updatedAt: note.updatedAt,
    });
  }

  return artifacts;
}

function collectSignalLines(note: NoteItem) {
  return unique([
    ...note.highlights,
    ...note.preview,
    ...note.rawExcerpt.split("\n").map((line) => line.trim()).filter(Boolean),
  ]).filter((line) => line.length > 2);
}

function inferActor(note: NoteItem) {
  const frontmatter = note.frontmatter || {};
  return frontmatter.actor || frontmatter.agent || note.tags[0] || (isWorklogPath(note.path) ? "ai" : undefined);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function summarizeArtifactCounts(artifacts: OpsArtifactRecord[]) {
  return {
    total: artifacts.length,
    worklogs: countByType(artifacts, "worklog"),
    decisions: countByType(artifacts, "decision"),
    learnings: countByType(artifacts, "learning"),
  };
}

function countByType(artifacts: OpsArtifactRecord[], type: OpsArtifactType) {
  return artifacts.filter((artifact) => artifact.artifactType === type).length;
}
