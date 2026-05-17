import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(new URL("../supabase/ops-schema.sql", import.meta.url), "utf8");

const planningTables = [
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

test("ops planning schema creates all normalized planning tables", () => {
  for (const table of planningTables) {
    assert.match(schema, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
  }
});

test("ops planning schema enables RLS on every planning table", () => {
  for (const table of planningTables) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
  }
});

test("ops planning schema links planning data to projects with cascade deletes", () => {
  for (const table of planningTables) {
    if (table === "ops_project_prds" || table === "ops_project_planning_documents") {
      assert.match(
        schema,
        new RegExp(`create table if not exists public\\.${table}[\\s\\S]+project_id text [\\s\\S]+references public\\.ops_projects\\(id\\) on delete cascade`),
        `${table} should reference ops_projects`,
      );
      continue;
    }

    assert.match(
      schema,
      new RegExp(`create table if not exists public\\.${table}[\\s\\S]+project_id text not null references public\\.ops_projects\\(id\\) on delete cascade`),
      `${table} should reference ops_projects`,
    );
  }
});

test("ops planning schema captures Manyfast-style IA and suggestion constraints", () => {
  assert.match(schema, /priority text not null check \(priority in \('low', 'medium', 'high'\)\)/);
  assert.match(schema, /status text not null check \(status in \('todo', 'doing', 'done', 'blocked'\)\)/);
  assert.match(schema, /target_type text not null check \(target_type in \('prd', 'requirement', 'feature', 'specification', 'ia-page', 'user-flow', 'wireframe', 'architecture', 'canvas', 'agent-task'\)\)/);
  assert.match(schema, /layout_type text not null check \(layout_type in \('hero', 'list', 'form', 'table', 'kanban', 'canvas', 'modal', 'sidebar', 'chart', 'custom'\)\)/);
  assert.match(schema, /evidence_type text not null check \(evidence_type in \('route', 'component', 'api', 'service', 'schema', 'job', 'docs', 'config', 'auth'\)\)/);
});
