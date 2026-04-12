import "server-only";

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { NoteType, OpsArtifactRecord, WorklogRecord } from "@/lib/ops/types";

type ExportArtifactInput = {
  artifactType: Exclude<OpsArtifactRecord["artifactType"], "worklog">;
  title: string;
  summary: string;
  highlights: string[];
  decisions: string[];
  learnings: string[];
  blockers: string[];
  nextActions: string[];
  linkedNoteIds: string[];
  updatedAt: string;
};

export type ObsidianExportWorklogInput = {
  noteId: string;
  title: string;
  summary: string;
  project?: string;
  actor: string;
  repo?: string;
  branch?: string;
  status: WorklogRecord["status"];
  sourceMachine?: string;
  sessionId?: string;
  runId?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
  tags: string[];
  highlights: string[];
  decisions: string[];
  blockers: string[];
  nextActions: string[];
  noteType: NoteType;
  notePath?: string;
  noteTitle?: string;
  noteContent?: string;
  noteLinks?: string[];
  workspaceRootLabel?: string;
  artifacts: ExportArtifactInput[];
};

export type ObsidianExportResult = {
  attempted: boolean;
  wroteFile: boolean;
  rootPath?: string;
  absolutePath?: string;
  relativePath: string;
  existed: boolean;
  reason?: "workspace-unavailable" | "write-failed";
  error?: string;
};

export function buildDeterministicObsidianPath(input: ObsidianExportWorklogInput) {
  if (input.notePath?.trim()) return normalizeRelativePath(input.notePath);

  const timestamp = input.startedAt || input.updatedAt;
  const date = new Date(timestamp);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const minuteStamp = buildMinuteStamp(timestamp);
  const slug = slugify([input.actor, input.repo || input.project || input.title].filter(Boolean).join(" ")) || "assistant-worklog";
  return path.posix.join("obsidian-vault", "01 Worklog", year, month, day, `${year}-${month}-${day}-${minuteStamp}-${slug}.md`);
}

export function buildObsidianMarkdown(input: ObsidianExportWorklogInput) {
  if (input.noteContent?.trim()) {
    return input.noteContent.trim().endsWith("\n") ? input.noteContent.trim() : `${input.noteContent.trim()}\n`;
  }

  const noteTitle = input.noteTitle?.trim() || input.title;
  const frontmatter = buildFrontmatter(input);
  const sections: string[] = [
    "---",
    ...frontmatter,
    "---",
    `# ${noteTitle}`,
    input.summary,
  ];

  pushSection(sections, "Highlights", input.highlights);
  pushSection(sections, "Decisions", input.decisions);
  pushSection(sections, "Blockers", input.blockers);
  pushSection(sections, "Next actions", input.nextActions);

  if (input.artifacts.length) {
    sections.push("", "## Typed artifacts");
    for (const artifact of input.artifacts) {
      sections.push("", `### ${artifact.artifactType}: ${artifact.title}`, artifact.summary);
      pushSection(sections, "Highlights", artifact.highlights, 4);
      pushSection(sections, "Decisions", artifact.decisions, 4);
      pushSection(sections, "Learnings", artifact.learnings, 4);
      pushSection(sections, "Blockers", artifact.blockers, 4);
      pushSection(sections, "Next actions", artifact.nextActions, 4);
      if (artifact.linkedNoteIds.length) {
        sections.push("", "#### Linked notes", ...artifact.linkedNoteIds.map((item) => `- [[${item}]]`));
      }
    }
  }

  if (input.noteLinks?.length) {
    sections.push("", "## Related links", ...input.noteLinks.map((item) => `- [[${item}]]`));
  }

  return `${sections.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export async function exportWorklogToObsidian(input: ObsidianExportWorklogInput): Promise<ObsidianExportResult> {
  const relativePath = buildDeterministicObsidianPath(input);
  const workspaceRoot = await resolveWorkspaceRoot();
  if (!workspaceRoot) {
    return {
      attempted: false,
      wroteFile: false,
      relativePath,
      existed: false,
      reason: "workspace-unavailable",
    };
  }

  const absolutePath = path.join(workspaceRoot, relativePath);
  const content = buildObsidianMarkdown(input);

  try {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    const existed = await fileExists(absolutePath);
    await fs.writeFile(absolutePath, content, "utf8");
    return {
      attempted: true,
      wroteFile: true,
      rootPath: workspaceRoot,
      absolutePath,
      relativePath,
      existed,
    };
  } catch (error) {
    return {
      attempted: true,
      wroteFile: false,
      rootPath: workspaceRoot,
      absolutePath,
      relativePath,
      existed: false,
      reason: "write-failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildFrontmatter(input: ObsidianExportWorklogInput) {
  const lines = [
    `type: ${input.noteType}`,
    `project: ${yamlValue(input.project)}`,
    "record_type: ai-worklog",
    `note_id: ${yamlValue(input.noteId)}`,
    `status: ${input.status}`,
    `actor: ${yamlValue(input.actor)}`,
    `repo: ${yamlValue(input.repo)}`,
    `branch: ${yamlValue(input.branch)}`,
    `source_machine: ${yamlValue(input.sourceMachine)}`,
    `session_id: ${yamlValue(input.sessionId)}`,
    `run_id: ${yamlValue(input.runId)}`,
    `started_at: ${yamlValue(input.startedAt || undefined)}`,
    `finished_at: ${yamlValue(input.finishedAt || undefined)}`,
    `updated_at: ${yamlValue(input.updatedAt)}`,
    `workspace_root_label: ${yamlValue(input.workspaceRootLabel)}`,
    `tags: ${yamlArray(input.tags)}`,
    `links: ${yamlArray(input.noteLinks || [])}`,
  ];

  const typedArtifactTypes = Array.from(new Set(input.artifacts.map((artifact) => artifact.artifactType)));
  if (typedArtifactTypes.length) {
    lines.push(`typed_artifacts: ${yamlArray(typedArtifactTypes)}`);
  }

  return lines;
}

function pushSection(target: string[], title: string, items: string[], depth = 2) {
  if (!items.length) return;
  target.push("", `${"#".repeat(depth)} ${title}`, ...items.map((item) => `- ${item}`));
}

async function resolveWorkspaceRoot() {
  const explicit = process.env.PORTFOLIO_OPS_OBSIDIAN_EXPORT_ROOT?.trim();
  if (explicit) return path.resolve(explicit);

  const workspaceRoot = process.env.PORTFOLIO_OPS_WORKSPACE_ROOT?.trim()
    || process.env.OPENCLAW_WORKSPACE?.trim()
    || process.env.WORKSPACE_ROOT?.trim()
    || path.join(os.homedir(), ".openclaw", "workspace");

  const resolved = path.resolve(workspaceRoot);
  return await directoryExists(resolved) ? resolved : null;
}

async function directoryExists(target: string) {
  try {
    const stat = await fs.stat(target);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(target: string) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

function normalizeRelativePath(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function buildMinuteStamp(timestamp: string) {
  const date = new Date(timestamp);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}${minutes}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function yamlArray(values: string[]) {
  if (!values.length) return "[]";
  return `[${values.map((value) => yamlValue(value)).join(", ")}]`;
}

function yamlValue(value?: string) {
  if (!value) return "null";
  return JSON.stringify(value);
}
