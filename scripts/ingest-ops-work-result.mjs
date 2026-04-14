#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import { applyOpsIngest, createOpsIngestPayloadFromWorkResult } from "../lib/ops/ingest-core.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args.repoRoot || process.cwd());
  const input = await readInput(args.input);
  const payload = args.payload ? input : createOpsIngestPayloadFromWorkResult(input, {
    workspaceRoot: args.workspaceRoot,
  });

  if (args.printPayload) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (args.mode === "http") {
    const endpoint = args.endpoint || process.env.PORTFOLIO_OPS_INGEST_URL || "http://127.0.0.1:3000/api/ops/ingest";
    const result = await postPayload(endpoint, payload, args.token || process.env.PORTFOLIO_OPS_INGEST_TOKEN);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = await applyOpsIngest(payload, {
    repoRoot,
    workspaceRoot: args.workspaceRoot,
  });
  console.log(JSON.stringify(result, null, 2));
}

async function readInput(filePath) {
  if (!filePath || filePath === "-") {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
}

async function postPayload(endpoint, payload, token) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `HTTP ${response.status}`);
  }

  return body;
}

function parseArgs(argv) {
  const args = {
    input: "-",
    mode: "local",
    payload: false,
    printPayload: false,
    endpoint: undefined,
    token: undefined,
    workspaceRoot: process.env.PORTFOLIO_OPS_WORKSPACE_ROOT,
    repoRoot: process.env.PORTFOLIO_OPS_REPO_ROOT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input" && next) {
      args.input = next;
      index += 1;
    } else if (arg === "--mode" && next) {
      args.mode = next;
      index += 1;
    } else if (arg === "--endpoint" && next) {
      args.endpoint = next;
      index += 1;
    } else if (arg === "--token" && next) {
      args.token = next;
      index += 1;
    } else if (arg === "--workspace-root" && next) {
      args.workspaceRoot = next;
      index += 1;
    } else if (arg === "--repo-root" && next) {
      args.repoRoot = next;
      index += 1;
    } else if (arg === "--payload") {
      args.payload = true;
    } else if (arg === "--print-payload") {
      args.printPayload = true;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (!["local", "http"].includes(args.mode)) {
    throw new Error(`Unsupported --mode: ${args.mode}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/ingest-ops-work-result.mjs [--input file.json|-] [--mode local|http] [--payload] [--repo-root /path/to/repo] [--workspace-root /path/to/workspace]\n\nModes:\n  local  Apply the ingest directly to data/ops/tasks.json and optional Obsidian mirror\n  http   POST the ingest payload to /api/ops/ingest\n\nInput:\n  default input shape is a structured work result (taskId, completedWork, nextActions, ...)
  pass --payload when the input is already a final ingest payload`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
