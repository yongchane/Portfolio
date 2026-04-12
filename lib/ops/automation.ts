import { promises as fs } from "fs";
import path from "path";
import type { OpsAutomationStatus } from "@/lib/ops/types";

const runtimeStatusPath = path.join(process.cwd(), ".ops-runtime", "automation-status.json");
const fallbackStatusPath = path.join(process.cwd(), "data", "ops", "automation-status.json");

export async function getOpsAutomationStatus(): Promise<OpsAutomationStatus> {
  for (const statusPath of [runtimeStatusPath, fallbackStatusPath]) {
    try {
      const raw = await fs.readFile(statusPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<OpsAutomationStatus>;
      return {
        mode: parsed.mode ?? "manual",
        state: parsed.state ?? "manual",
        updatedAt: parsed.updatedAt,
        heartbeatAt: parsed.heartbeatAt,
        startedAt: parsed.startedAt,
        stoppedAt: parsed.stoppedAt,
        pid: parsed.pid,
        watchMode: parsed.watchMode,
        watchTargets: parsed.watchTargets ?? [],
        watchTargetsCount: parsed.watchTargetsCount,
        queuedReason: parsed.queuedReason,
        restartCount: parsed.restartCount,
        lastRunStartedAt: parsed.lastRunStartedAt,
        lastRunFinishedAt: parsed.lastRunFinishedAt,
        lastRunStatus: parsed.lastRunStatus,
        lastRunReason: parsed.lastRunReason,
        lastRunMessage: parsed.lastRunMessage,
        lastErrorAt: parsed.lastErrorAt,
        lastErrorMessage: parsed.lastErrorMessage,
        watchTargetsSummary: parsed.watchTargetsSummary,
        nextSuggestedAction: parsed.nextSuggestedAction,
        statusPath: parsed.statusPath ?? path.relative(process.cwd(), statusPath),
        logPath: parsed.logPath,
        lockPath: parsed.lockPath,
      };
    } catch {
      continue;
    }
  }

  return {
    mode: "manual",
    state: "manual",
    statusPath: path.relative(process.cwd(), runtimeStatusPath),
    logPath: path.relative(process.cwd(), path.join(process.cwd(), ".ops-runtime", "ops-watch.log")),
    lockPath: ".ops-source-sync.lock",
    nextSuggestedAction: "Install the LaunchAgent or cron entry to make /ops automation automatic.",
  };
}
