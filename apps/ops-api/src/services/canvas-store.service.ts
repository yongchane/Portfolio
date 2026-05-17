import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ContractService } from "./contract.service";
import { repoRoot } from "./repo-root";

type StoredCanvas = {
  projectId: string;
  canvas: unknown;
  updatedAt: string;
};

@Injectable()
export class CanvasStoreService {
  constructor(private readonly contract: ContractService) {}

  private get canvasPath() {
    return path.join(repoRoot(), "data", "ops", "project-canvas.json");
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

  private async readLocalStore() {
    const raw = await readFile(this.canvasPath, "utf8").catch(() => "{}");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, StoredCanvas>
      : {};
  }

  private async writeLocalStore(value: Record<string, StoredCanvas>) {
    await writeFile(this.canvasPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  async get(projectId: string): Promise<StoredCanvas | null> {
    const client = this.getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from("ops_project_canvases")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!error && data) {
        const row = data as { project_id: string; canvas: unknown; updated_at: string };
        return {
          projectId: row.project_id,
          canvas: row.canvas,
          updatedAt: row.updated_at,
        };
      }
    }

    const store = await this.readLocalStore();
    return store[projectId] || null;
  }

  async save(projectId: string, input: unknown): Promise<StoredCanvas> {
    const canvas = await this.contract.sanitizeCanvasPayload(input);
    const record = {
      projectId,
      canvas,
      updatedAt: new Date().toISOString(),
    };

    const client = this.getSupabaseClient();
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

    const store = await this.readLocalStore();
    store[projectId] = record;
    await this.writeLocalStore(store);
    return record;
  }
}
