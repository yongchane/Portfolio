#!/usr/bin/env node

import { promises as fsPromises, watch as watchFs } from "fs";
import path from "path";
import { spawn } from "child_process";

const repoRoot = process.cwd();
const lockPath = path.join(repoRoot, ".ops-source-sync.lock");
const statusFile = process.env.PORTFOLIO_OPS_AUTOMATION_STATUS_FILE
  ? path.resolve(process.env.PORTFOLIO_OPS_AUTOMATION_STATUS_FILE)
  : path.join(repoRoot, ".ops-runtime", "automation-status.json");
const args = new Set(process.argv.slice(2));
const watchMode = args.has("--watch");
const debounceMs = Number(process.env.PORTFOLIO_OPS_SYNC_DEBOUNCE_MS || 1200);
const staleMs = Number(process.env.PORTFOLIO_OPS_SYNC_LOCK_STALE_MS || 15 * 60 * 1000);

let timer = null;
let running = false;
let queuedReason = null;
let releaseLock = null;

main().catch(async (error) => {
  await writeAutomationStatus({
    state: watchMode ? "error" : "idle",
    lastRunFinishedAt: new Date().toISOString(),
    lastRunStatus: "failed",
    lastErrorAt: new Date().toISOString(),
    lastErrorMessage: error instanceof Error ? error.message : String(error),
  });
  console.error("[ops:source-sync]", error);
  process.exitCode = 1;
});

async function main() {
  if (!watchMode) {
    await runSync("manual");
    return;
  }

  await writeAutomationStatus({
    state: "running",
    pid: process.pid,
    heartbeatAt: new Date().toISOString(),
    watchMode: true,
  });

  const watchTargets = await resolveWatchTargets();
  if (!watchTargets.length) {
    throw new Error("No watch targets found. Set PORTFOLIO_OPS_WORKSPACE_ROOT or PORTFOLIO_OPS_NOTE_ROOTS before using --watch.");
  }

  console.log(`[ops:source-sync] watching ${watchTargets.length} path(s)`);
  await writeAutomationStatus({
    watchTargets: watchTargets.map((target) => path.relative(repoRoot, target) || target),
    watchTargetsCount: watchTargets.length,
    lastRunMessage: `Watching ${watchTargets.length} path(s).`,
  });
  await runSync("startup");

  for (const target of watchTargets) {
    const watcher = watchFs(target, { recursive: true }, (_eventType, filename) => {
      if (filename && shouldIgnore(String(filename))) return;
      queueSync(filename ? `${target}:${filename}` : target);
    });
    watcher.on("error", (error) => {
      console.error(`[ops:source-sync] watcher error on ${target}: ${error.message}`);
    });
  }

  process.stdin.resume();
}

async function resolveWatchTargets() {
  const workspaceRoot = process.env.PORTFOLIO_OPS_WORKSPACE_ROOT
    ? path.resolve(process.env.PORTFOLIO_OPS_WORKSPACE_ROOT)
    : path.resolve(process.env.OPENCLAW_WORKSPACE || process.env.WORKSPACE_ROOT || path.join(process.env.HOME || "", ".openclaw", "workspace"));
  const explicitRoots = (process.env.PORTFOLIO_OPS_NOTE_ROOTS || "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
  const noteRoots = explicitRoots.length
    ? explicitRoots
    : [path.join(workspaceRoot, "obsidian-vault"), path.join(workspaceRoot, "docs")];
  const candidates = [
    ...noteRoots,
    path.join(repoRoot, "data", "ops", "projects.json"),
    path.join(repoRoot, "data", "ops", "tasks.json"),
  ];
  const existing = [];
  for (const candidate of candidates) {
    try {
      await fsPromises.stat(candidate);
      existing.push(candidate);
    } catch {
      // ignore missing paths
    }
  }
  return existing;
}

function shouldIgnore(filename) {
  return /(^|[\\/])\.|\.swp$|~$/.test(filename);
}

function queueSync(reason) {
  queuedReason = reason;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const nextReason = queuedReason || "change";
    queuedReason = null;
    runSync(nextReason).catch((error) => {
      console.error("[ops:source-sync]", error);
    });
  }, debounceMs);
}

async function runSync(reason) {
  if (running) {
    queuedReason = reason;
    await writeAutomationStatus({
      state: watchMode ? "running" : "idle",
      queuedReason,
      lastRunMessage: `Sync already running; queued ${reason}.`,
    });
    return;
  }

  running = true;
  await writeAutomationStatus({
    state: watchMode ? "running" : "syncing",
    pid: process.pid,
    heartbeatAt: new Date().toISOString(),
    lastRunStartedAt: new Date().toISOString(),
    lastRunStatus: "started",
    lastRunReason: reason,
    lastRunMessage: `Sync started (${reason}).`,
    queuedReason: undefined,
  });
  releaseLock = await acquireLock();
  try {
    console.log(`[ops:source-sync] run start (${reason})`);
    await runNodeScript("scripts/sync-ops-supabase.mjs");
    console.log("[ops:source-sync] run complete");
    await writeAutomationStatus({
      state: watchMode ? "running" : "idle",
      heartbeatAt: new Date().toISOString(),
      lastRunFinishedAt: new Date().toISOString(),
      lastRunStatus: "succeeded",
      lastRunReason: reason,
      lastRunMessage: `Sync finished successfully (${reason}).`,
      lastErrorAt: "",
      lastErrorMessage: "",
    });
  } catch (error) {
    await writeAutomationStatus({
      state: watchMode ? "error" : "idle",
      heartbeatAt: new Date().toISOString(),
      lastRunFinishedAt: new Date().toISOString(),
      lastRunStatus: "failed",
      lastRunReason: reason,
      lastRunMessage: `Sync failed (${reason}).`,
      lastErrorAt: new Date().toISOString(),
      lastErrorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await releaseLock?.();
    releaseLock = null;
    running = false;
    if (queuedReason) {
      const next = queuedReason;
      queuedReason = null;
      queueSync(next);
    }
  }
}

async function acquireLock() {
  try {
    const handle = await fsPromises.open(lockPath, "wx");
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2));
    return async () => {
      await handle.close();
      await fsPromises.rm(lockPath, { force: true });
    };
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const stat = await fsPromises.stat(lockPath).catch(() => null);
    if (stat && Date.now() - stat.mtimeMs > staleMs) {
      await fsPromises.rm(lockPath, { force: true });
      return acquireLock();
    }
    throw new Error(`Another ops source sync is already running (${lockPath}). Remove stale lock or wait.`);
  }
}

async function runNodeScript(scriptPath) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${scriptPath} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function readAutomationStatus() {
  try {
    const raw = await fsPromises.readFile(statusFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeAutomationStatus(patch) {
  await fsPromises.mkdir(path.dirname(statusFile), { recursive: true });
  const current = await readAutomationStatus();
  const next = {
    ...current,
    mode: process.env.PORTFOLIO_OPS_AUTOMATION_MODE || current.mode || (watchMode ? "watch" : "manual"),
    updatedAt: new Date().toISOString(),
    lockPath: path.relative(repoRoot, lockPath),
    statusPath: path.relative(repoRoot, statusFile),
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
  };
  await fsPromises.writeFile(statusFile, `${JSON.stringify(next, null, 2)}\n`);
}
