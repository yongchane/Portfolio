import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { repoRoot } from "./repo-root";

type ExportRecord = {
  id: string;
  projectId: string;
  exportType: string;
  format: string;
  filename: string;
  payload: Record<string, unknown>;
  artifactPath?: string;
  createdAt: string;
};

type ExportStore = Record<string, ExportRecord[]>;

@Injectable()
export class ExportStoreService {
  private get localPath() {
    return path.join(repoRoot(), "data", "ops", "project-exports.json");
  }

  private getSupabaseClient() {
    const url = process.env.PORTFOLIO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) return null;

    return createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async save(projectId: string, deliverable: {
    exportType?: string;
    format?: string;
    filename?: string;
    content?: string;
    generatedAt?: string;
  }) {
    const record: ExportRecord = {
      id: randomUUID(),
      projectId,
      exportType: deliverable.exportType || "canvas",
      format: deliverable.format || "md",
      filename: deliverable.filename || `${projectId}-export.md`,
      payload: {
        content: deliverable.content || "",
        generatedAt: deliverable.generatedAt || new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    };

    const client = this.getSupabaseClient();
    if (client) {
      const { error } = await client.from("ops_project_exports").insert({
        id: record.id,
        project_id: record.projectId,
        export_type: record.exportType,
        format: record.format,
        filename: record.filename,
        payload: record.payload,
        artifact_path: record.artifactPath || null,
        created_at: record.createdAt,
      } as never);
      if (!error) return record;
    }

    const store = await this.readLocalStore();
    store[projectId] = [record, ...(store[projectId] || [])];
    await this.writeLocalStore(store);
    return record;
  }

  private async readLocalStore() {
    const raw = await readFile(this.localPath, "utf8").catch(() => "{}");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as ExportStore
      : {};
  }

  private async writeLocalStore(value: ExportStore) {
    await mkdir(path.dirname(this.localPath), { recursive: true });
    await writeFile(this.localPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}
