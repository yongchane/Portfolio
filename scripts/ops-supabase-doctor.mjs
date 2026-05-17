#!/usr/bin/env node
import { promises as fs } from "node:fs";
import dns from "node:dns/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const ENV_FILES = [".env.local", ".env.development.local", ".env.development", ".env"];
const REQUIRED_TABLES = [
  "ops_projects",
  "ops_tasks",
  "ops_notes",
  "ops_worklogs",
  "ops_artifacts",
  "ops_worker_heartbeats",
  "ops_host_status",
  "ops_openclaw_status",
  "ops_sync_requests",
  "ops_agents",
  "ops_agent_runs",
  "ops_ai_reviews",
  "ops_project_planning_documents",
  "ops_project_prds",
  "ops_project_requirements",
  "ops_project_features",
  "ops_project_specifications",
  "ops_project_ia_pages",
  "ops_project_user_flows",
  "ops_project_user_flow_steps",
  "ops_project_wireframe_blocks",
  "ops_project_architecture_nodes",
  "ops_project_github_evidence",
  "ops_project_ai_suggestions",
  "ops_project_exports",
];

await loadLocalEnvFiles();

const url = getEnv("PORTFOLIO_SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = getEnv("PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_ROLE_KEY");

console.log("/ops Supabase Doctor");
console.log("====================");

if (!url) {
  fail("Missing PORTFOLIO_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}

let host;
try {
  host = new URL(url).host;
  console.log(`URL host: ${host}`);
} catch {
  fail("Supabase URL is not a valid URL.");
  process.exit(1);
}

if (!key) {
  fail("Missing PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
console.log("Service key: present (redacted)");

try {
  const addresses = await dns.resolve(host);
  ok(`DNS resolves: ${addresses.join(", ")}`);
} catch (error) {
  fail(`DNS does not resolve for ${host}: ${error.code || error.message}`);
  console.log("Hint: confirm the Supabase project ref/URL in .env and Vercel env. The deployed /ops and Mac mini worker must point at an active Supabase project.");
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
let failures = 0;
for (const table of REQUIRED_TABLES) {
  const { error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    failures += 1;
    fail(`${table}: ${error.message}`);
  } else {
    ok(`${table}: reachable`);
  }
}

if (failures) {
  console.log(`\n${failures} table(s) failed. Apply supabase/ops-schema.sql to the active Supabase project, then rerun npm run ops:doctor.`);
  process.exit(3);
}

ok("All required /ops tables are reachable.");

async function loadLocalEnvFiles() {
  for (const file of [...ENV_FILES, path.join(".vercel", ".env.development.local")]) {
    const envPath = path.join(repoRoot, file);
    let content = "";
    try {
      content = await fs.readFile(envPath, "utf8");
    } catch {
      continue;
    }
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] == null) process.env[key] = value;
    }
  }
}

function getEnv(name) {
  return process.env[name]?.trim() || "";
}

function ok(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  console.log(`❌ ${message}`);
}
