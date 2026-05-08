#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const workerId = process.env.PORTFOLIO_OPS_WORKER_ID || "mac-mini-main";
const workerName = process.env.PORTFOLIO_OPS_WORKER_NAME || "Mac mini Ops Worker";
const machine = process.env.PORTFOLIO_OPS_WORKER_MACHINE || os.hostname();
const intervalMs = Number(process.env.PORTFOLIO_OPS_WORKER_INTERVAL_MS || 30000);
const once = process.argv.includes("--once");
const nodeBin = process.execPath;

function getEnv(name) {
  return process.env[name]?.trim() || "";
}

function createSupabase() {
  const url = getEnv("PORTFOLIO_SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing PORTFOLIO_SUPABASE_URL and PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const supabase = createSupabase();

async function main() {
  if (once) {
    await tick();
    return;
  }

  console.log(`[ops-worker] started ${workerId} on ${machine}, interval=${intervalMs}ms`);
  while (true) {
    await tick().catch((error) => console.error("[ops-worker] tick failed", error));
    await sleep(intervalMs);
  }
}

async function tick() {
  await pushHeartbeat("online");
  await pushHostStatus();
  await pushOpenClawStatus();
  await processSyncRequest();
  await processAgentRun();
}

async function pushHeartbeat(status, payload = {}) {
  const { error } = await supabase.from("ops_worker_heartbeats").upsert({
    id: workerId,
    worker_name: workerName,
    machine,
    status,
    version: process.env.npm_package_version || "0.1.0",
    last_seen_at: new Date().toISOString(),
    payload: {
      repoRoot,
      node: process.version,
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      ...payload,
    },
  });
  if (error) throw new Error(`heartbeat upsert failed: ${error.message}`);
}

async function pushHostStatus() {
  const memory = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem(),
  };
  const cpu = {
    loadAverage: os.loadavg(),
    cores: os.cpus().length,
    model: os.cpus()[0]?.model,
  };
  const disk = await readDiskStatus();
  const processes = await readProcessHints();

  const { error } = await supabase.from("ops_host_status").insert({
    machine,
    cpu,
    memory,
    disk,
    uptime_seconds: Math.round(os.uptime()),
    network: { interfaces: Object.keys(os.networkInterfaces()) },
    processes,
  });
  if (error) throw new Error(`host status insert failed: ${error.message}`);
}

async function pushOpenClawStatus() {
  const gateway = await safeExec("openclaw", ["gateway", "status"], 5000);
  const statusText = gateway.ok ? gateway.stdout.trim() : gateway.stderr || gateway.error || "unknown";
  const gatewayStatus = gateway.ok && /running|active|listening|started/i.test(statusText) ? "running" : gateway.ok ? "ok" : "unknown";

  const { error } = await supabase.from("ops_openclaw_status").insert({
    machine,
    gateway_status: gatewayStatus,
    model: { source: "worker", note: "Detailed model state is provided by OpenClaw runtime when available." },
    sessions: [],
    cron: {},
    issues: gateway.ok ? [] : [{ title: "openclaw gateway status failed", detail: statusText }],
  });
  if (error) throw new Error(`openclaw status insert failed: ${error.message}`);
}

async function processSyncRequest() {
  const { data, error } = await supabase
    .from("ops_sync_requests")
    .select("*")
    .eq("status", "queued")
    .order("requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`sync request lookup failed: ${error.message}`);
  if (!data) return;

  await supabase.from("ops_sync_requests").update({ status: "running", started_at: new Date().toISOString() }).eq("id", data.id);

  try {
    const result = await runSyncByType(data.type);
    await supabase
      .from("ops_sync_requests")
      .update({ status: "completed", finished_at: new Date().toISOString(), result })
      .eq("id", data.id);
  } catch (error) {
    await supabase
      .from("ops_sync_requests")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) })
      .eq("id", data.id);
  }
}

async function runSyncByType(type) {
  const commands = [];
  if (type === "worklogs" || type === "all") commands.push([nodeBin, ["scripts/ops-source-sync.mjs"]]);
  if (type === "github" || type === "all") commands.push([nodeBin, ["scripts/sync-ops-github.mjs"]]);
  if (type === "host") return { message: "host status is pushed every worker tick" };
  if (type === "openclaw") return { message: "openclaw status is pushed every worker tick" };

  const outputs = [];
  for (const [cmd, args] of commands) {
    const run = await safeExec(cmd, args, 120000);
    if (!run.ok) throw new Error(`${cmd} ${args.join(" ")} failed: ${run.stderr || run.error}`);
    outputs.push({ command: `${path.basename(cmd)} ${args.join(" ")}`, stdout: run.stdout.slice(-2000) });
  }
  return { outputs };
}

async function processAgentRun() {
  const { data, error } = await supabase
    .from("ops_agent_runs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`agent run lookup failed: ${error.message}`);
  if (!data) return;

  const now = new Date().toISOString();
  await supabase.from("ops_agent_runs").update({ status: "running", started_at: now }).eq("id", data.id);

  const resultSummary = "Mac mini worker acknowledged this agent run. Runtime execution is intentionally stubbed until OpenClaw/ACP execution policy is wired.";
  await supabase
    .from("ops_agent_runs")
    .update({
      status: "needs_approval",
      result_summary: resultSummary,
      verification: { mode: "safe-stub", workerId, machine },
      finished_at: new Date().toISOString(),
    })
    .eq("id", data.id);
}

async function readDiskStatus() {
  const run = await safeExec("df", ["-k", "/"], 5000);
  if (!run.ok) return { error: run.error || run.stderr };
  const line = run.stdout.trim().split("\n")[1];
  if (!line) return { raw: run.stdout.trim() };
  const parts = line.trim().split(/\s+/);
  return { filesystem: parts[0], sizeKb: Number(parts[1]), usedKb: Number(parts[2]), availableKb: Number(parts[3]), capacity: parts[4], mount: parts[5] };
}

async function readProcessHints() {
  const commands = [
    ["pgrep", ["-fl", "openclaw"]],
    ["pgrep", ["-fl", "ops-mac-mini-worker"]],
  ];
  const results = [];
  for (const [cmd, args] of commands) {
    const run = await safeExec(cmd, args, 3000);
    results.push({ command: `${cmd} ${args.join(" ")}`, ok: run.ok, output: (run.stdout || run.stderr || run.error || "").slice(0, 1000) });
  }
  return results;
}

async function safeExec(command, args, timeout) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: repoRoot, timeout, maxBuffer: 1024 * 1024 });
    return { ok: true, stdout, stderr };
  } catch (error) {
    return { ok: false, stdout: error.stdout || "", stderr: error.stderr || "", error: error.message };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(async (error) => {
  console.error("[ops-worker] fatal", error);
  try { await pushHeartbeat("error", { error: error instanceof Error ? error.message : String(error) }); } catch {}
  process.exit(1);
});
