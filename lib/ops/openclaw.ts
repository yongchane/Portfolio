import "server-only";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  OpenClawDiagnostics,
  OpenClawFileSnapshot,
  OpenClawModelSnapshot,
  OpenClawOperatingIssue,
  OpenClawPreferenceSnapshot,
} from "@/lib/ops/types";

const WORKSPACE_ROOT = path.join(os.homedir(), ".openclaw", "workspace");
const CONFIG_PATH = path.join(os.homedir(), ".openclaw", "openclaw.json");

const TRACKED_FILES: Array<{ id: string; label: string; path: string; kind: OpenClawFileSnapshot["kind"] }> = [
  { id: "agents", label: "Workspace operating rules", path: path.join(WORKSPACE_ROOT, "AGENTS.md"), kind: "policy" },
  { id: "soul", label: "Assistant persona", path: path.join(WORKSPACE_ROOT, "SOUL.md"), kind: "identity" },
  { id: "identity", label: "Assistant identity", path: path.join(WORKSPACE_ROOT, "IDENTITY.md"), kind: "identity" },
  { id: "user", label: "User profile", path: path.join(WORKSPACE_ROOT, "USER.md"), kind: "profile" },
  { id: "memory", label: "Long-term memory", path: path.join(WORKSPACE_ROOT, "MEMORY.md"), kind: "memory" },
  { id: "heartbeat", label: "Heartbeat instructions", path: path.join(WORKSPACE_ROOT, "HEARTBEAT.md"), kind: "automation" },
  { id: "tools", label: "Local tool notes", path: path.join(WORKSPACE_ROOT, "TOOLS.md"), kind: "tooling" },
];

export async function getOpenClawDiagnostics(): Promise<OpenClawDiagnostics> {
  const [config, files] = await Promise.all([readJsonSafe(CONFIG_PATH), Promise.all(TRACKED_FILES.map(readTrackedFile))]);
  const model = buildModelSnapshot(config);
  const preferences = await buildPreferenceSnapshot();
  const issues = detectOperatingIssues({ config, files, model, preferences });

  return {
    generatedAt: new Date().toISOString(),
    host: os.hostname(),
    workspaceRoot: WORKSPACE_ROOT,
    configPath: CONFIG_PATH,
    model,
    preferences,
    files,
    issues,
    health: {
      score: Math.max(0, 100 - issues.reduce((total, issue) => total + (issue.severity === "high" ? 25 : issue.severity === "medium" ? 12 : 5), 0)),
      high: issues.filter((issue) => issue.severity === "high").length,
      medium: issues.filter((issue) => issue.severity === "medium").length,
      low: issues.filter((issue) => issue.severity === "low").length,
    },
  };
}

async function readJsonSafe(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function readTextSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function readTrackedFile(entry: (typeof TRACKED_FILES)[number]): Promise<OpenClawFileSnapshot> {
  try {
    const [stat, text] = await Promise.all([fs.stat(entry.path), readTextSafe(entry.path)]);
    return {
      id: entry.id,
      label: entry.label,
      kind: entry.kind,
      path: entry.path,
      exists: true,
      updatedAt: stat.mtime.toISOString(),
      bytes: stat.size,
      lineCount: text ? text.split(/\r?\n/).length : 0,
      summary: summarizeFile(entry.id, text),
    };
  } catch {
    return {
      id: entry.id,
      label: entry.label,
      kind: entry.kind,
      path: entry.path,
      exists: false,
      summary: "file missing",
    };
  }
}

function buildModelSnapshot(config: Record<string, unknown> | null): OpenClawModelSnapshot {
  const agents = asRecord(config?.agents);
  const defaults = asRecord(config?.defaults);
  const modelDefaults = asRecord(defaults?.model);
  const providers = asRecord(config?.providers);
  const openaiCodex = asRecord(providers?.["openai-codex"]);
  const catalog = asRecord(openaiCodex?.models);
  const configuredAgents = Object.entries(agents || {}).map(([id, value]) => {
    const record = asRecord(value);
    return {
      id,
      model: typeof record?.model === "string" ? record.model : undefined,
    };
  });

  return {
    primary: typeof modelDefaults?.primary === "string" ? modelDefaults.primary : undefined,
    fallback: Array.isArray(modelDefaults?.fallbacks) ? modelDefaults.fallbacks.filter((item): item is string => typeof item === "string") : [],
    allowed: Array.isArray(modelDefaults?.allowed) ? modelDefaults.allowed.filter((item): item is string => typeof item === "string") : [],
    gpt55Configured: JSON.stringify(config || {}).includes("gpt-5.5"),
    configuredAgents,
    openaiCodexModelCount: catalog ? Object.keys(catalog).length : undefined,
  };
}

async function buildPreferenceSnapshot(): Promise<OpenClawPreferenceSnapshot> {
  const [memory, today] = await Promise.all([
    readTextSafe(path.join(WORKSPACE_ROOT, "MEMORY.md")),
    readTextSafe(path.join(WORKSPACE_ROOT, "memory", new Date().toISOString().slice(0, 10) + ".md")),
  ]);
  const combined = `${memory}\n${today}`;
  return {
    checklistFirst: /체크리스트|checklist/i.test(combined),
    conciseKeywordReport: /키워드|keyword|간결|brief/i.test(combined),
    preferredAssistantName: combined.includes("애옹") ? "애옹" : undefined,
    preferredModelMention: combined.match(/openai-codex\/gpt-5\.5|gpt-5\.5/i)?.[0],
    staleModelMention: combined.includes("gpt-5-mini") || combined.includes("gpt-5.4"),
  };
}

function detectOperatingIssues(input: {
  config: Record<string, unknown> | null;
  files: OpenClawFileSnapshot[];
  model: OpenClawModelSnapshot;
  preferences: OpenClawPreferenceSnapshot;
}): OpenClawOperatingIssue[] {
  const issues: OpenClawOperatingIssue[] = [];

  if (!input.config) {
    issues.push({ id: "openclaw-config-missing", severity: "high", title: "OpenClaw config not readable", detail: "~/.openclaw/openclaw.json could not be parsed from the /ops runtime.", recommendation: "Check local deployment permissions before relying on /ops config diagnostics." });
  }
  if (!input.model.gpt55Configured) {
    issues.push({ id: "model-not-gpt55", severity: "medium", title: "GPT-5.5 not visible in config", detail: "The current config snapshot does not mention gpt-5.5.", recommendation: "Keep openai-codex/gpt-5.5 as primary and a previous model as fallback." });
  }
  if (input.preferences.staleModelMention) {
    issues.push({ id: "stale-memory-model", severity: "low", title: "Memory may contain stale model notes", detail: "Long-term memory still references an older model string.", recommendation: "Update MEMORY.md so /ops and assistant behavior agree on the preferred model." });
  }
  for (const file of input.files) {
    if (!file.exists && ["agents", "soul", "user", "memory"].includes(file.id)) {
      issues.push({ id: `missing-${file.id}`, severity: "medium", title: `${file.label} missing`, detail: file.path, recommendation: "Restore the file so assistant behavior and /ops inspection stay explainable." });
    }
  }
  const heartbeat = input.files.find((file) => file.id === "heartbeat");
  if (heartbeat?.exists && (heartbeat.bytes || 0) < 120) {
    issues.push({ id: "heartbeat-empty", severity: "low", title: "Heartbeat has no active checklist", detail: "HEARTBEAT.md is effectively empty, so proactive recurring work is not directed from the workspace.", recommendation: "Add only high-signal recurring instructions when there is a durable monitoring need." });
  }
  return issues;
}

function summarizeFile(id: string, text: string) {
  if (!text.trim()) return "empty";
  if (id === "memory") {
    const bullets = text.split(/\r?\n/).filter((line) => line.trim().startsWith("-")).slice(0, 3);
    return bullets.join(" ") || "long-term memory available";
  }
  if (id === "heartbeat") return text.replace(/\s+/g, " ").slice(0, 180);
  const heading = text.split(/\r?\n/).find((line) => line.startsWith("# "));
  return heading ? heading.replace(/^#\s*/, "") : text.replace(/\s+/g, " ").slice(0, 180);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
