import {
  mapArtifactRow,
  mapNoteRow,
  mapTaskRow,
  type ArtifactRow,
  type NoteRow,
  type TaskRow,
} from "@/lib/ops/adapters/supabase";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const row = {
  id: "task-json-array",
  title: "Handle JSON string arrays",
  project_id: "portfolio",
  category: "ops",
  status: "doing",
  summary: "Supabase returned JSONB arrays as strings",
  completed_work: '["completed"]',
  next_actions: '["next"]',
  related_docs: '["doc"]',
  related_commits: '["commit"]',
  note_ids: '["note"]',
  needs_decision: '["decision"]',
  updated_at: "2026-05-09T12:00:00.000Z",
} as unknown as TaskRow;

const task = mapTaskRow(row);

assert(task.completedWork[0] === "completed", "completed_work JSON string should be parsed");
assert(task.nextActions[0] === "next", "next_actions JSON string should be parsed");
assert(task.relatedDocs?.[0] === "doc", "related_docs JSON string should be parsed");
assert(task.relatedCommits?.[0] === "commit", "related_commits JSON string should be parsed");
assert(task.noteIds?.[0] === "note", "note_ids JSON string should be parsed");
assert(task.needsDecision?.[0] === "decision", "needs_decision JSON string should be parsed");

const noteRow = {
  id: "note-json-array",
  title: "JSON Array Note",
  type: "project-ops",
  project: "Portfolio 운영 콘솔",
  tags: '["ops","docs"]',
  updated_at: "2026-05-09T12:00:00.000Z",
  path: "docs/json-array-note.md",
  workspace_root_label: "workspace",
  summary: "Docs/Vault should handle stringified JSONB arrays",
  highlights: '["highlight"]',
  headings: '["Heading"]',
  preview: '["preview"]',
  links: '["other-note"]',
  raw_excerpt: "# Heading\n- highlight",
} as unknown as NoteRow;

const note = mapNoteRow(noteRow);

assert(note.tags[0] === "ops", "note tags JSON string should be parsed");
assert(note.highlights[0] === "highlight", "note highlights JSON string should be parsed");
assert(note.headings[0] === "Heading", "note headings JSON string should be parsed");
assert(note.preview[0] === "preview", "note preview JSON string should be parsed");
assert(note.links[0] === "other-note", "note links JSON string should be parsed");

const artifactRow = {
  id: "artifact-json-array",
  note_id: note.id,
  title: "JSON Array Artifact",
  artifact_type: "decision",
  project: "Portfolio 운영 콘솔",
  path: "docs/json-array-note.md",
  summary: "Typed artifacts should handle stringified JSONB arrays",
  actor: "애옹",
  source_machine: "test",
  repo: "yongchane/Portfolio",
  branch: "develop",
  status: "completed",
  tags: '["ops"]',
  highlights: '["highlight"]',
  decisions: '["decision"]',
  learnings: '["learning"]',
  blockers: '["blocker"]',
  next_actions: '["next"]',
  linked_note_ids: `["${note.id}"]`,
  updated_at: "2026-05-09T12:00:00.000Z",
} as unknown as ArtifactRow;

const artifact = mapArtifactRow(artifactRow);

assert(artifact.tags[0] === "ops", "artifact tags JSON string should be parsed");
assert(artifact.highlights[0] === "highlight", "artifact highlights JSON string should be parsed");
assert(artifact.decisions[0] === "decision", "artifact decisions JSON string should be parsed");
assert(artifact.learnings[0] === "learning", "artifact learnings JSON string should be parsed");
assert(artifact.blockers[0] === "blocker", "artifact blockers JSON string should be parsed");
assert(artifact.nextActions[0] === "next", "artifact next_actions JSON string should be parsed");
assert(artifact.linkedNoteIds[0] === note.id, "artifact linked_note_ids JSON string should be parsed");
