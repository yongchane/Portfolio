#!/usr/bin/env node

import { promises as fsPromises } from "fs";
import path from "path";
import { spawn } from "child_process";

const repoRoot = process.cwd();
const runtimeDir = path.join(repoRoot, ".ops-runtime");
const pidPath = path.join(runtimeDir, "ops-watch.pid");
const logPath = path.join(runtimeDir, "ops-watch.log");
const statusPath = path.join(runtimeDir, "automation-status.json");
const lockPath = path.join(repoRoot, ".ops-source-sync.lock");
const args = process.argv.slice(2);
const command = args[0] || "status";
const automationMode = process.env.PORTFOLIO_OPS_AUTOMATION_MODE || "manual";
const heartbeatMs = Number(process.env.PORTFOLIO_OPS_AUTOMATION_HEARTBEAT_MS || 30000);
const detached = !args.includes("--foreground");

main().catch(async (error) => {
  await updateStatus({
    mode: automationMode,
    state: "error",
    lastErrorAt: new Date().toISOString(),
    lastErrorMessage: error instanceof Error ? error.message : String(error),
    nextSuggestedAction: "Check automation log or run `node scripts/ops-automation.mjs status`.",
  });
  console.error("[ops:automation]", error);
  process.exitCode = 1;
});

async function main() {
  await fsPromises.mkdir(runtimeDir, { recursive: true });
  await fsPromises.mkdir(path.dirname(statusPath), { recursive: true });

  if (command === "daemon") {
    await runDaemon();
    return;
  }

  if (command === "ensure-watch") {
    const started = await ensureWatchProcess();
    console.log(started ? "started" : "already-running");
    return;
  }

  if (command === "stop") {
    const stopped = await stopWatchProcess();
    console.log(stopped ? "stopped" : "not-running");
    return;
  }

  if (command === "status") {
    const status = await readStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function ensureWatchProcess() {
  const current = await readPidFile();
  if (current && await isPidRunning(current.pid)) {
    await updateStatus({
      mode: automationMode,
      state: "running",
      pid: current.pid,
      nextSuggestedAction: "Watcher already running.",
    });
    return false;
  }

  if (!detached) {
    await runDaemon();
    return true;
  }

  const child = spawn(process.execPath, ["scripts/ops-automation.mjs", "daemon"], {
    cwd: repoRoot,
    env: { ...process.env, PORTFOLIO_OPS_AUTOMATION_MODE: automationMode || "cron" },
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await updateStatus({
    mode: automationMode === "manual" ? "cron" : automationMode,
    state: "starting",
    pid: child.pid,
    startedAt: new Date().toISOString(),
    logPath,
    lockPath,
    statusPath,
    nextSuggestedAction: "Allow the watcher a few seconds to boot, then re-run status.",
  });
  return true;
}

async function runDaemon() {
  const previous = await readStatus();
  const current = await readPidFile();
  if (current && await isPidRunning(current.pid)) {
    throw new Error(`Watcher already running with pid ${current.pid}`);
  }

  await writePidFile(process.pid);
  const logHandle = await fsPromises.open(logPath, "a");
  let lastHeartbeatAt = new Date().toISOString();
  let child = null;
  let shuttingDown = false;

  const writeLog = async (line) => {
    await logHandle.appendFile(`${new Date().toISOString()} ${line}\n`);
  };

  const syncStatus = async (patch = {}) => {
    lastHeartbeatAt = new Date().toISOString();
    await updateStatus({
      mode: automationMode === "manual" ? "watch" : automationMode,
      state: "running",
      pid: process.pid,
      startedAt: previous.startedAt || new Date().toISOString(),
      heartbeatAt: lastHeartbeatAt,
      logPath,
      lockPath,
      statusPath,
      restartCount: (previous.restartCount || 0) + 1,
      nextSuggestedAction: "launchd KeepAlive or cron ensure-watch should keep this watcher alive.",
      ...patch,
    });
  };

  const heartbeat = setInterval(() => {
    syncStatus().catch(() => undefined);
  }, heartbeatMs);

  const shutdown = async (signal = "SIGTERM") => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(heartbeat);
    if (child && !child.killed) child.kill(signal);
    await updateStatus({
      mode: automationMode === "manual" ? "watch" : automationMode,
      state: "stopped",
      pid: undefined,
      stoppedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString(),
      nextSuggestedAction: "Run ensure-watch or reload the LaunchAgent to start it again.",
    });
    await removePidFile();
    await writeLog(`[daemon] stopped (${signal})`);
    await logHandle.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("exit", () => {
    void removePidFile();
  });

  await writeLog("[daemon] starting child watcher");
  await syncStatus({
    startedAt: new Date().toISOString(),
    lastRunMessage: "Watcher booted. Waiting for initial sync.",
  });

  child = spawn(process.execPath, ["scripts/ops-source-sync.mjs", "--watch"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORTFOLIO_OPS_AUTOMATION_STATUS_FILE: statusPath,
      PORTFOLIO_OPS_AUTOMATION_LOG_FILE: logPath,
      PORTFOLIO_OPS_AUTOMATION_MODE: automationMode === "manual" ? "watch" : automationMode,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", async (chunk) => {
    const text = chunk.toString();
    await logHandle.appendFile(text);
    const patch = parseWatcherOutput(text);
    if (patch) await syncStatus(patch);
  });

  child.stderr.on("data", async (chunk) => {
    const text = chunk.toString();
    await logHandle.appendFile(text);
    const patch = parseWatcherOutput(text) || {
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: text.trim().slice(-400),
    };
    await syncStatus(patch);
  });

  child.on("exit", async (code, signal) => {
    clearInterval(heartbeat);
    await updateStatus({
      mode: automationMode === "manual" ? "watch" : automationMode,
      state: code === 0 ? "stopped" : "error",
      pid: undefined,
      heartbeatAt: new Date().toISOString(),
      stoppedAt: new Date().toISOString(),
      lastErrorAt: code === 0 ? undefined : new Date().toISOString(),
      lastErrorMessage: code === 0 ? undefined : `Watcher exited with code ${code}${signal ? ` (${signal})` : ""}`,
      nextSuggestedAction: code === 0
        ? "No action required unless you expect background watching to continue."
        : "If launchd/cron is installed, it should restart this automatically. Otherwise run ensure-watch.",
    });
    await removePidFile();
    await writeLog(`[daemon] child exited code=${code} signal=${signal || ""}`);
    await logHandle.close();
    process.exit(code ?? 1);
  });
}

function parseWatcherOutput(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.includes("run start")) {
    return {
      lastRunStartedAt: new Date().toISOString(),
      lastRunStatus: "started",
      lastRunMessage: trimmed.slice(-400),
    };
  }

  if (trimmed.includes("run complete")) {
    return {
      lastRunFinishedAt: new Date().toISOString(),
      lastRunStatus: "succeeded",
      lastRunMessage: trimmed.slice(-400),
    };
  }

  if (trimmed.includes("watching")) {
    return {
      watchTargetsSummary: trimmed.slice(-400),
      lastRunMessage: trimmed.slice(-400),
    };
  }

  if (trimmed.includes("exited with code") || trimmed.includes("Another ops source sync is already running") || trimmed.includes("Error")) {
    return {
      lastRunFinishedAt: new Date().toISOString(),
      lastRunStatus: "failed",
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: trimmed.slice(-400),
      lastRunMessage: trimmed.slice(-400),
    };
  }

  return {
    heartbeatAt: new Date().toISOString(),
    lastRunMessage: trimmed.slice(-400),
  };
}

async function stopWatchProcess() {
  const current = await readPidFile();
  if (!current || !(await isPidRunning(current.pid))) {
    await removePidFile();
    await updateStatus({
      state: "stopped",
      pid: undefined,
      stoppedAt: new Date().toISOString(),
      nextSuggestedAction: "Nothing is running. Use ensure-watch if you want it back up.",
    });
    return false;
  }
  process.kill(current.pid, "SIGTERM");
  return true;
}

async function readPidFile() {
  try {
    const raw = await fsPromises.readFile(pidPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pid === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writePidFile(pid) {
  await fsPromises.writeFile(pidPath, JSON.stringify({ pid, startedAt: new Date().toISOString() }, null, 2));
}

async function removePidFile() {
  await fsPromises.rm(pidPath, { force: true }).catch(() => undefined);
}

async function isPidRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readStatus() {
  try {
    const raw = await fsPromises.readFile(statusPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      mode: automationMode,
      state: "manual",
      statusPath,
      logPath,
      lockPath,
      nextSuggestedAction: "Install the LaunchAgent or cron entry to make /ops automation automatic.",
    };
  }
}

async function updateStatus(patch) {
  const current = await readStatus();
  const next = {
    mode: current.mode || automationMode,
    state: current.state || "manual",
    updatedAt: new Date().toISOString(),
    statusPath,
    logPath,
    lockPath,
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
  };
  await fsPromises.writeFile(statusPath, `${JSON.stringify(next, null, 2)}\n`);
}
