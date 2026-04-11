#!/usr/bin/env node

import { watch } from "fs";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import { promises as fs } from "fs";

const workspaceRoot = process.env.PORTFOLIO_OPS_WORKSPACE_ROOT
  ? path.resolve(process.env.PORTFOLIO_OPS_WORKSPACE_ROOT)
  : path.join(os.homedir(), ".openclaw", "workspace");

const roots = parseRoots(process.env.PORTFOLIO_OPS_NOTE_ROOTS, workspaceRoot);
const watchedDirs = new Set();
let pendingSync = null;
let activeSync = null;

async function main() {
  const resolvedRoots = [];
  for (const root of roots) {
    try {
      const stat = await fs.stat(root);
      if (stat.isDirectory()) resolvedRoots.push(root);
    } catch {
      // ignore missing roots
    }
  }

  if (resolvedRoots.length === 0) {
    console.error("No note roots found to watch. Set PORTFOLIO_OPS_WORKSPACE_ROOT or PORTFOLIO_OPS_NOTE_ROOTS.");
    process.exit(1);
  }

  for (const root of resolvedRoots) {
    await watchTree(root);
  }

  console.log(`[ops:watch-notes] watching ${resolvedRoots.length} root(s)`);
  for (const root of resolvedRoots) {
    console.log(`- ${root}`);
  }

  runSync("initial");
}

async function watchTree(dir) {
  if (watchedDirs.has(dir)) return;
  watchedDirs.add(dir);

  const watcher = watch(dir, async (_eventType, filename) => {
    const target = filename ? path.join(dir, filename.toString()) : dir;
    try {
      const stat = await fs.stat(target);
      if (stat.isDirectory()) {
        await watchTree(target);
      }
    } catch {
      // deleted path; nothing to add
    }

    if (/\.(md|mdx)$/i.test(target) || !filename) {
      scheduleSync(target);
    }
  });

  watcher.on("error", (error) => {
    console.error(`[ops:watch-notes] watcher error on ${dir}:`, error.message);
  });

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await watchTree(path.join(dir, entry.name));
    }
  }
}

function scheduleSync(target) {
  if (pendingSync) clearTimeout(pendingSync);
  pendingSync = setTimeout(() => {
    pendingSync = null;
    runSync(target);
  }, 250);
}

function runSync(reason) {
  if (activeSync) return;

  console.log(`[ops:watch-notes] syncing (${reason})`);
  activeSync = spawn(process.execPath, ["scripts/export-ops-notes.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  activeSync.on("exit", (code) => {
    if (code === 0) {
      console.log("[ops:watch-notes] sync complete");
    } else {
      console.error(`[ops:watch-notes] sync failed with code ${code}`);
    }
    activeSync = null;
  });
}

function parseRoots(raw, root) {
  if (raw) {
    return raw.split(path.delimiter).map((item) => path.resolve(item.trim())).filter(Boolean);
  }

  return [path.join(root, "obsidian-vault"), path.join(root, "docs")];
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
