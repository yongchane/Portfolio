import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeCanvasPayload } from "@/lib/ops/project-management-contract.mjs";
import { getOpsDataMode, getSupabaseAdminClient, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import type { ProjectCanvasEdge, ProjectCanvasNode, RepoAnalysisResult } from "@/components/ops/project-management/mock-data";

const canvasPath = path.join(process.cwd(), "data", "ops", "project-canvas.json");

export type StoredProjectCanvas = {
  projectId: string;
  canvas: {
    nodes: ProjectCanvasNode[];
    edges: ProjectCanvasEdge[];
    summary?: RepoAnalysisResult["summary"];
  };
  updatedAt: string;
};

async function readStore(): Promise<Record<string, StoredProjectCanvas>> {
  const raw = await readFile(canvasPath, "utf8").catch(() => "{}");
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, StoredProjectCanvas>)
    : {};
}

async function writeStore(value: Record<string, StoredProjectCanvas>) {
  await writeFile(canvasPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function getSupabaseCanvasContext() {
  const mode = getOpsDataMode();
  if (mode === "local") return null;

  const client = getSupabaseAdminClient();
  if (!client) return null;

  const diagnostics = await getSupabaseOpsDiagnostics();
  return diagnostics.available ? client : null;
}

export async function getStoredProjectCanvas(projectId: string) {
  const client = await getSupabaseCanvasContext();
  if (client) {
    const { data, error } = await client
      .from("ops_project_canvases")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (!error && data) {
      const row = data as { project_id: string; canvas: StoredProjectCanvas["canvas"]; updated_at: string };
      return {
        projectId: row.project_id,
        canvas: row.canvas,
        updatedAt: row.updated_at,
      } satisfies StoredProjectCanvas;
    }
  }

  const store = await readStore();
  return store[projectId] ?? null;
}

export async function saveStoredProjectCanvas(projectId: string, input: unknown) {
  const canvas = sanitizeCanvasPayload(input && typeof input === "object" ? input : {});
  if (!canvas.nodes.length) {
    throw new Error("Canvas must include at least one node.");
  }

  const store = await readStore();
  const record: StoredProjectCanvas = {
    projectId,
    canvas,
    updatedAt: new Date().toISOString(),
  };

  const client = await getSupabaseCanvasContext();
  if (client) {
    const { error } = await client
      .from("ops_project_canvases")
      .upsert({
        project_id: projectId,
        canvas,
        updated_at: record.updatedAt,
      } as never, { onConflict: "project_id" });

    if (!error) return record;
  }

  store[projectId] = record;
  await writeStore(store);
  return record;
}
