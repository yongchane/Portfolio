import { Injectable } from "@nestjs/common";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CanvasStoreService } from "./canvas-store.service";
import { ContractService } from "./contract.service";
import { PlanningStoreService } from "./planning-store.service";
import { repoRoot } from "./repo-root";

type SuggestionTarget =
  | "prd"
  | "requirement"
  | "feature"
  | "specification"
  | "ia-page"
  | "user-flow"
  | "wireframe"
  | "architecture"
  | "canvas"
  | "agent-task";

type SuggestionAction = "create" | "update" | "delete" | "link";
type SuggestionStatus = "pending" | "approved" | "rejected";

export type AiSuggestion = {
  id: string;
  projectId: string;
  targetType: SuggestionTarget;
  action: SuggestionAction;
  proposedValue: Record<string, unknown>;
  rationale: string;
  evidenceIds: string[];
  status: SuggestionStatus;
  createdBy: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
};

type SuggestionStore = Record<string, AiSuggestion[]>;
type PlanningDocument = {
  iaPages?: Array<Record<string, unknown>>;
  specifications?: Array<Record<string, unknown>>;
  wireframes?: Array<Record<string, unknown>>;
  architecture?: Array<Record<string, unknown>>;
};
type OpsSupabaseClient = SupabaseClient<any, "public", "public", any, any>;

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

@Injectable()
export class SuggestionStoreService {
  constructor(
    private readonly planningStore: PlanningStoreService,
    private readonly canvasStore: CanvasStoreService,
    private readonly contract: ContractService,
  ) {}

  private get localPath() {
    return path.join(repoRoot(), "data", "ops", "project-suggestions.json");
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

  async list(projectId: string, status?: SuggestionStatus) {
    const fromSupabase = await this.listFromSupabase(projectId, status);
    if (fromSupabase) return fromSupabase;

    const store = await this.readLocalStore();
    const rows = store[projectId] || [];
    return status ? rows.filter((item) => item.status === status) : rows;
  }

  async create(projectId: string, input: Partial<AiSuggestion>) {
    const suggestion = this.sanitizeSuggestion(projectId, input);
    if (await this.insertSupabase(suggestion)) return suggestion;

    const store = await this.readLocalStore();
    store[projectId] = [suggestion, ...(store[projectId] || [])];
    await this.writeLocalStore(store);
    return suggestion;
  }

  async generate(projectId: string) {
    const stored = await this.planningStore.get(projectId);
    const planning = (stored?.planning || {}) as PlanningDocument;
    const existing = await this.list(projectId, "pending");
    const existingKeys = new Set(existing.map((item) => this.dedupeKey(item)));
    const candidates = this.buildCandidates(projectId, planning)
      .filter((item) => !existingKeys.has(this.dedupeKey(item)));

    const created: AiSuggestion[] = [];
    for (const candidate of candidates) {
      created.push(await this.create(projectId, candidate));
    }
    return created;
  }

  async approve(projectId: string, suggestionId: string, decidedBy = "operator") {
    const suggestion = await this.find(projectId, suggestionId);
    if (!suggestion) return null;
    if (suggestion.status !== "pending") return suggestion;

    const appliedPlanning = await this.applySuggestion(projectId, suggestion);
    const updated = await this.setStatus(projectId, suggestionId, "approved", decidedBy);
    return updated ? { suggestion: updated, planning: appliedPlanning } : null;
  }

  async reject(projectId: string, suggestionId: string, decidedBy = "operator") {
    const suggestion = await this.find(projectId, suggestionId);
    if (!suggestion) return null;
    if (suggestion.status !== "pending") return { suggestion, planning: null };

    const updated = await this.setStatus(projectId, suggestionId, "rejected", decidedBy);
    return updated ? { suggestion: updated, planning: null } : null;
  }

  private buildCandidates(projectId: string, planning: PlanningDocument): Array<Partial<AiSuggestion>> {
    const iaPages = asArray<Record<string, unknown>>(planning.iaPages);
    const specs = asArray<Record<string, unknown>>(planning.specifications);
    const wireframes = asArray<Record<string, unknown>>(planning.wireframes);
    const architecture = asArray<Record<string, unknown>>(planning.architecture);
    const candidates: Array<Partial<AiSuggestion>> = [];

    const pagesWithoutWireframes = iaPages.filter((page) => {
      const pageId = String(page.id || "");
      return pageId && !wireframes.some((block) => block.pageId === pageId || block.page_id === pageId);
    });
    for (const page of pagesWithoutWireframes.slice(0, 3)) {
      const pageId = String(page.id);
      candidates.push({
        targetType: "wireframe",
        action: "create",
        proposedValue: {
          id: `ai-wireframe-${pageId}`,
          pageId,
          sectionName: `${String(page.title || pageId)} 핵심 화면 블록`,
          layoutType: "custom",
          contentPurpose: "GitHub route 분석에는 페이지가 있으나 UI 블록 명세가 비어 있어 canvas/문서 출력의 설명력이 낮습니다.",
          linkedSpecificationIds: asArray(page.linkedSpecificationIds),
          evidenceIds: asArray(page.evidenceIds),
          order: wireframes.length + candidates.length,
          source: "ai-suggestion",
        },
        rationale: `${String(page.title || pageId)} 페이지에 대응되는 wireframe block을 추가해 IA와 화면 명세를 연결합니다.`,
        evidenceIds: asArray<string>(page.evidenceIds),
      });
    }

    const specsWithoutPages = specs.filter((spec) => !asArray(spec.linkedPageIds).length);
    for (const spec of specsWithoutPages.slice(0, 2)) {
      candidates.push({
        targetType: "ia-page",
        action: "create",
        proposedValue: {
          id: `ai-page-${String(spec.id || randomUUID()).replace(/[^a-zA-Z0-9-]/g, "-")}`,
          projectId,
          title: String(spec.title || "제안 페이지"),
          route: undefined,
          depth: 2,
          description: "기능 명세는 존재하지만 연결된 IA 페이지가 없어 사용자 흐름에서 누락될 수 있습니다.",
          linkedSpecificationIds: [spec.id].filter(Boolean),
          linkedUserFlowStepIds: [],
          linkedWireframeBlockIds: [],
          evidenceIds: asArray(spec.evidenceIds),
          source: "ai-suggestion",
          confidence: 0.72,
        },
        rationale: `${String(spec.title || spec.id)} 명세를 사용자가 접근 가능한 IA 페이지 후보로 승격합니다.`,
        evidenceIds: asArray<string>(spec.evidenceIds),
      });
    }

    const hasAgentArchitecture = architecture.some((node) => node.kind === "agent" || /agent|ai/i.test(String(node.label || "")));
    if (!hasAgentArchitecture) {
      candidates.push({
        targetType: "architecture",
        action: "create",
        proposedValue: {
          id: "ai-architecture-agent-orchestrator",
          projectId,
          kind: "agent",
          label: "AI Suggestion Orchestrator",
          description: "Planning/canvas 데이터를 분석해 PRD, IA, spec, architecture 변경 후보를 만들고 승인 후에만 원본 데이터에 반영합니다.",
          codeRefs: ["apps/ops-api/src/services/suggestion-store.service.ts"],
          apiLinks: [
            "GET /api/ops/projects/:id/suggestions",
            "POST /api/ops/projects/:id/suggestions/generate",
            "POST /api/ops/projects/:id/suggestions/:suggestionId/approve",
            "POST /api/ops/projects/:id/suggestions/:suggestionId/reject",
          ],
          evidenceIds: [],
          source: "ai-suggestion",
          confidence: 0.78,
        },
        rationale: "사용자 목표에 있는 AI 에이전트 기반 관리 흐름을 architecture에 명시합니다.",
        evidenceIds: [],
      });
    }

    return candidates;
  }

  private async applySuggestion(projectId: string, suggestion: AiSuggestion) {
    const stored = await this.planningStore.get(projectId);
    const planning = { ...(stored?.planning || { projectId }) } as PlanningDocument & Record<string, unknown>;
    const proposedValue = {
      ...suggestion.proposedValue,
      source: "ai-suggestion",
    };

    if (suggestion.action === "create") {
      if (suggestion.targetType === "ia-page") planning.iaPages = this.upsertById(planning.iaPages, proposedValue);
      if (suggestion.targetType === "specification") planning.specifications = this.upsertById(planning.specifications, proposedValue);
      if (suggestion.targetType === "wireframe") planning.wireframes = this.upsertById(planning.wireframes, proposedValue);
      if (suggestion.targetType === "architecture") planning.architecture = this.upsertById(planning.architecture, proposedValue);
    }

    planning.canvas = await this.contract.buildPlanningCanvasModel(planning);
    const saved = await this.planningStore.save(projectId, planning);
    if (saved.planning.canvas && typeof saved.planning.canvas === "object") {
      await this.canvasStore.save(projectId, saved.planning.canvas);
    }
    return saved.planning;
  }

  private upsertById(value: unknown, row: Record<string, unknown>) {
    const rows = asArray<Record<string, unknown>>(value);
    const id = String(row.id || "");
    if (!id) return rows;
    if (rows.some((item) => item.id === id)) return rows.map((item) => item.id === id ? { ...item, ...row } : item);
    return [...rows, row];
  }

  private async find(projectId: string, suggestionId: string) {
    return (await this.list(projectId)).find((item) => item.id === suggestionId) || null;
  }

  private async setStatus(projectId: string, suggestionId: string, status: SuggestionStatus, decidedBy: string) {
    const decidedAt = new Date().toISOString();
    const client = this.getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from("ops_project_ai_suggestions")
        .update({ status, decided_at: decidedAt, decided_by: decidedBy } as never)
        .eq("project_id", projectId)
        .eq("id", suggestionId)
        .select("*")
        .maybeSingle();
      if (!error && data) return this.mapSupabaseRow(data as Record<string, unknown>);
    }

    const store = await this.readLocalStore();
    const rows = store[projectId] || [];
    const nextRows = rows.map((item) => item.id === suggestionId ? { ...item, status, decidedAt, decidedBy } : item);
    store[projectId] = nextRows;
    await this.writeLocalStore(store);
    return nextRows.find((item) => item.id === suggestionId) || null;
  }

  private async listFromSupabase(projectId: string, status?: SuggestionStatus) {
    const client = this.getSupabaseClient();
    if (!client) return null;

    let query = client
      .from("ops_project_ai_suggestions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return null;
    return asArray<Record<string, unknown>>(data).map((row) => this.mapSupabaseRow(row));
  }

  private async insertSupabase(suggestion: AiSuggestion) {
    const client = this.getSupabaseClient();
    if (!client) return false;

    const { error } = await client.from("ops_project_ai_suggestions").insert({
      id: suggestion.id,
      project_id: suggestion.projectId,
      target_type: suggestion.targetType,
      action: suggestion.action,
      proposed_value: suggestion.proposedValue,
      rationale: suggestion.rationale,
      evidence_ids: suggestion.evidenceIds,
      status: suggestion.status,
      created_by: suggestion.createdBy,
      created_at: suggestion.createdAt,
      decided_at: suggestion.decidedAt || null,
      decided_by: suggestion.decidedBy || null,
    } as never);
    return !error;
  }

  private sanitizeSuggestion(projectId: string, input: Partial<AiSuggestion>): AiSuggestion {
    const now = new Date().toISOString();
    const targetType = this.sanitizeEnum<SuggestionTarget>(input.targetType, ["prd", "requirement", "feature", "specification", "ia-page", "user-flow", "wireframe", "architecture", "canvas", "agent-task"], "canvas");
    const action = this.sanitizeEnum<SuggestionAction>(input.action, ["create", "update", "delete", "link"], "create");
    const status = this.sanitizeEnum<SuggestionStatus>(input.status, ["pending", "approved", "rejected"], "pending");

    return {
      id: input.id || randomUUID(),
      projectId,
      targetType,
      action,
      proposedValue: input.proposedValue && typeof input.proposedValue === "object" ? input.proposedValue : {},
      rationale: input.rationale || "AI suggestion",
      evidenceIds: asArray<string>(input.evidenceIds),
      status,
      createdBy: input.createdBy || "ai",
      createdAt: input.createdAt || now,
      decidedAt: input.decidedAt,
      decidedBy: input.decidedBy,
    };
  }

  private sanitizeEnum<T extends string>(value: unknown, options: T[], fallback: T) {
    return options.includes(value as T) ? value as T : fallback;
  }

  private dedupeKey(suggestion: Partial<AiSuggestion>) {
    return [
      suggestion.targetType,
      suggestion.action,
      suggestion.proposedValue?.id,
      suggestion.proposedValue?.pageId,
      suggestion.rationale,
    ].filter(Boolean).join(":");
  }

  private mapSupabaseRow(row: Record<string, unknown>): AiSuggestion {
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      targetType: row.target_type as SuggestionTarget,
      action: row.action as SuggestionAction,
      proposedValue: row.proposed_value && typeof row.proposed_value === "object" ? row.proposed_value as Record<string, unknown> : {},
      rationale: String(row.rationale || ""),
      evidenceIds: asArray<string>(row.evidence_ids),
      status: row.status as SuggestionStatus,
      createdBy: String(row.created_by || "ai"),
      createdAt: String(row.created_at || ""),
      decidedAt: row.decided_at ? String(row.decided_at) : undefined,
      decidedBy: row.decided_by ? String(row.decided_by) : undefined,
    };
  }

  private async readLocalStore() {
    const raw = await readFile(this.localPath, "utf8").catch(() => "{}");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as SuggestionStore
      : {};
  }

  private async writeLocalStore(value: SuggestionStore) {
    await mkdir(path.dirname(this.localPath), { recursive: true });
    await writeFile(this.localPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}
