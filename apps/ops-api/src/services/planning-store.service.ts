import { Injectable } from "@nestjs/common";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./repo-root";

type PlanningDocument = {
  id: string;
  projectId: string;
  source: "idea" | "github" | "manual" | "ai";
  prd?: Record<string, unknown>;
  requirements?: Array<Record<string, unknown>>;
  features?: Array<Record<string, unknown>>;
  specifications?: Array<Record<string, unknown>>;
  iaPages?: Array<Record<string, unknown>>;
  userFlows?: Array<Record<string, unknown> & { steps?: Array<Record<string, unknown>> }>;
  wireframes?: Array<Record<string, unknown>>;
  architecture?: Array<Record<string, unknown>>;
  canvas?: Record<string, unknown>;
  agentTasks?: Array<Record<string, unknown>>;
  evidence?: Array<Record<string, unknown>>;
  updatedAt?: string;
};

type StoredPlanning = {
  projectId: string;
  planning: PlanningDocument;
  updatedAt: string;
};

type PlanningItem = Record<string, unknown>;
type PlanningFlow = PlanningItem & { steps?: PlanningItem[] };
type OpsSupabaseClient = SupabaseClient<any, "public", "public", any, any>;

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

@Injectable()
export class PlanningStoreService {
  private get localPath() {
    return path.join(repoRoot(), "data", "ops", "project-planning.json");
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
    const raw = await readFile(this.localPath, "utf8").catch(() => "{}");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, StoredPlanning>
      : {};
  }

  private async writeLocalStore(value: Record<string, StoredPlanning>) {
    await mkdir(path.dirname(this.localPath), { recursive: true });
    await writeFile(this.localPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  async get(projectId: string): Promise<StoredPlanning | null> {
    const supabase = await this.getFromSupabase(projectId);
    if (supabase) return supabase;

    const store = await this.readLocalStore();
    return store[projectId] || null;
  }

  async save(projectId: string, input: unknown): Promise<StoredPlanning> {
    const planning = this.sanitizePlanning(projectId, input);
    const record: StoredPlanning = {
      projectId,
      planning,
      updatedAt: planning.updatedAt || new Date().toISOString(),
    };

    if (await this.saveToSupabase(record)) return record;

    const store = await this.readLocalStore();
    store[projectId] = record;
    await this.writeLocalStore(store);
    return record;
  }

  private sanitizePlanning(projectId: string, input: unknown): PlanningDocument {
    const value = input && typeof input === "object" ? input as PlanningDocument : {} as PlanningDocument;
    const updatedAt = new Date().toISOString();
    return {
      id: typeof value.id === "string" && value.id ? value.id : `planning-${projectId}`,
      projectId,
      source: ["idea", "github", "manual", "ai"].includes(String(value.source)) ? value.source : "github",
      prd: value.prd && typeof value.prd === "object" ? value.prd : {},
      requirements: asArray(value.requirements),
      features: asArray(value.features),
      specifications: asArray(value.specifications),
      iaPages: asArray(value.iaPages),
      userFlows: asArray(value.userFlows),
      wireframes: asArray(value.wireframes),
      architecture: asArray(value.architecture),
      canvas: value.canvas && typeof value.canvas === "object" ? value.canvas : {},
      agentTasks: asArray(value.agentTasks),
      evidence: asArray(value.evidence),
      updatedAt,
    };
  }

  private async getFromSupabase(projectId: string): Promise<StoredPlanning | null> {
    const client = this.getSupabaseClient();
    if (!client) return null;

    const [
      docResult,
      prdResult,
      requirementsResult,
      featuresResult,
      specificationsResult,
      iaPagesResult,
      userFlowsResult,
      userFlowStepsResult,
      wireframesResult,
      architectureResult,
      evidenceResult,
    ] = await Promise.all([
      client.from("ops_project_planning_documents").select("*").eq("project_id", projectId).maybeSingle(),
      client.from("ops_project_prds").select("*").eq("project_id", projectId).maybeSingle(),
      client.from("ops_project_requirements").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_features").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_specifications").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_ia_pages").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_user_flows").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_user_flow_steps").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_wireframe_blocks").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_architecture_nodes").select("*").eq("project_id", projectId).order("sort_order", { ascending: true }),
      client.from("ops_project_github_evidence").select("*").eq("project_id", projectId),
    ]);

    if (docResult.error || !docResult.data) return null;

    const stepsByFlow = new Map<string, unknown[]>();
    for (const row of asArray<Record<string, unknown>>(userFlowStepsResult.data)) {
      const flowId = String(row.flow_id || "");
      stepsByFlow.set(flowId, [...(stepsByFlow.get(flowId) || []), this.mapFlowStep(row)]);
    }
    const planning: PlanningDocument = {
      id: String((docResult.data as { id: string }).id),
      projectId,
      source: (docResult.data as { source?: PlanningDocument["source"] }).source || "github",
      prd: prdResult.data ? this.mapPrd(prdResult.data as Record<string, unknown>) : {},
      requirements: asArray<Record<string, unknown>>(requirementsResult.data).map((row) => this.mapRequirement(row)),
      features: asArray<Record<string, unknown>>(featuresResult.data).map((row) => this.mapFeature(row)),
      specifications: asArray<Record<string, unknown>>(specificationsResult.data).map((row) => this.mapSpecification(row)),
      iaPages: asArray<Record<string, unknown>>(iaPagesResult.data).map((row) => this.mapIaPage(row)),
      userFlows: asArray<Record<string, unknown>>(userFlowsResult.data).map((row) => this.mapUserFlow(row, asArray<PlanningItem>(stepsByFlow.get(String(row.id))))),
      wireframes: asArray<Record<string, unknown>>(wireframesResult.data).map((row) => this.mapWireframe(row)),
      architecture: asArray<Record<string, unknown>>(architectureResult.data).map((row) => this.mapArchitecture(row)),
      canvas: (docResult.data as { canvas_summary?: Record<string, unknown> }).canvas_summary || {},
      agentTasks: [],
      evidence: asArray<Record<string, unknown>>(evidenceResult.data).map((row) => this.mapEvidence(row)),
      updatedAt: String((docResult.data as { updated_at?: string }).updated_at || new Date().toISOString()),
    };

    return {
      projectId,
      planning,
      updatedAt: planning.updatedAt || new Date().toISOString(),
    };
  }

  private async saveToSupabase(record: StoredPlanning) {
    const client = this.getSupabaseClient();
    if (!client) return false;
    const projectId = record.projectId;
    const planning = record.planning;

    const docResult = await client.from("ops_project_planning_documents").upsert({
      project_id: projectId,
      source: planning.source,
      status: "draft",
      summary: String(planning.prd?.overview || ""),
      generated_from: { source: planning.source },
      canvas_summary: planning.canvas?.summary || planning.canvas || {},
      updated_at: record.updatedAt,
    } as never, { onConflict: "project_id" });
    if (docResult.error) return false;

    const deleteOrder = [
      "ops_project_user_flow_steps",
      "ops_project_wireframe_blocks",
      "ops_project_specifications",
      "ops_project_features",
      "ops_project_requirements",
      "ops_project_ia_pages",
      "ops_project_user_flows",
      "ops_project_architecture_nodes",
      "ops_project_github_evidence",
    ];

    for (const table of deleteOrder) {
      const { error } = await client.from(table).delete().eq("project_id", projectId);
      if (error) return false;
    }

    const prd = planning.prd || {};
    const prdResult = await client.from("ops_project_prds").upsert({
      project_id: projectId,
      overview: String(prd.overview || ""),
      goals: prd.goals || [],
      target_users: prd.targetUsers || [],
      core_values: prd.coreValues || [],
      scenarios: prd.scenarios || [],
      success_metrics: prd.successMetrics || [],
      risks: prd.risks || [],
      open_questions: prd.openQuestions || [],
      source: planning.source,
      updated_at: record.updatedAt,
    } as never, { onConflict: "project_id" });
    if (prdResult.error) return false;

    if (!(await this.insertRows(client, "ops_project_requirements", asArray<PlanningItem>(planning.requirements).map((item, index) => ({
        id: item.id,
        project_id: projectId,
        title: item.title,
        description: item.description || "",
        priority: item.priority || "medium",
        status: item.status || "todo",
        source: item.source || planning.source,
        sort_order: index,
        updated_at: record.updatedAt,
      }))))) return false;

    if (!(await this.insertRows(client, "ops_project_features", asArray<PlanningItem>(planning.features).map((item, index) => ({
        id: item.id,
        project_id: projectId,
        requirement_id: item.requirementId,
        title: item.title,
        description: item.description || "",
        user_role_ids: item.userRoleIds || [],
        status: item.status || "todo",
        source: item.source || planning.source,
        sort_order: index,
        updated_at: record.updatedAt,
      }))))) return false;

    if (!(await this.insertRows(client, "ops_project_ia_pages", asArray<PlanningItem>(planning.iaPages).map((item, index) => ({
        id: item.id,
        project_id: projectId,
        title: item.title,
        route: item.route || null,
        depth: item.depth || 1,
        parent_id: item.parentId || null,
        description: item.description || "",
        linked_specification_ids: item.linkedSpecificationIds || [],
        linked_user_flow_step_ids: item.linkedUserFlowStepIds || [],
        linked_wireframe_block_ids: item.linkedWireframeBlockIds || [],
        evidence_ids: item.evidenceIds || [],
        source: item.source || "github-analysis",
        confidence: item.confidence ?? null,
        sort_order: index,
        updated_at: record.updatedAt,
      }))))) return false;

    if (!(await this.insertRows(client, "ops_project_user_flows", asArray<PlanningItem>(planning.userFlows).map((item, index) => ({
        id: item.id,
        project_id: projectId,
        title: item.title,
        actor_role_id: item.actorRoleId || null,
        status: item.status || "draft",
        source: item.source || planning.source,
        sort_order: index,
        updated_at: record.updatedAt,
      }))))) return false;

    if (!(await this.insertRows(client, "ops_project_architecture_nodes", asArray<PlanningItem>(planning.architecture).map((item, index) => ({
        id: item.id,
        project_id: projectId,
        kind: item.kind,
        label: item.label,
        description: item.description || "",
        code_refs: item.codeRefs || [],
        api_links: item.apiLinks || [],
        evidence_ids: item.evidenceIds || [],
        source: item.source || "github-analysis",
        confidence: item.confidence ?? null,
        sort_order: index,
        updated_at: record.updatedAt,
      }))))) return false;

    if (!(await this.insertRows(client, "ops_project_github_evidence", asArray<PlanningItem>(planning.evidence).map((item) => ({
        id: item.id,
        project_id: projectId,
        repo: item.repo,
        branch: item.branch,
        path: item.path,
        evidence_type: item.evidenceType,
        summary: item.summary || "",
        imports: item.imports || [],
        api_calls: item.apiCalls || [],
        headings: item.headings || [],
        confidence: item.confidence ?? 0.75,
        updated_at: record.updatedAt,
      }))))) return false;

    const specificationRows = asArray<PlanningItem>(planning.specifications).map((item, index) => ({
      id: item.id,
      project_id: projectId,
      feature_id: item.featureId,
      title: item.title,
      behavior: item.behavior || "",
      acceptance_criteria: item.acceptanceCriteria || [],
      edge_cases: item.edgeCases || [],
      linked_page_ids: item.linkedPageIds || [],
      linked_api_ids: item.linkedApiIds || [],
      evidence_ids: item.evidenceIds || [],
      status: item.status || "todo",
      source: item.source || planning.source,
      sort_order: index,
      updated_at: record.updatedAt,
    }));
    if (!(await this.insertRows(client, "ops_project_specifications", specificationRows))) return false;

    const wireframeRows = asArray<PlanningItem>(planning.wireframes).map((item, index) => ({
      id: item.id,
      project_id: projectId,
      page_id: item.pageId,
      section_name: item.sectionName,
      layout_type: item.layoutType || "custom",
      content_purpose: item.contentPurpose || "",
      linked_specification_ids: item.linkedSpecificationIds || [],
      evidence_ids: item.evidenceIds || [],
      sort_order: item.order ?? index,
      source: item.source || planning.source,
      updated_at: record.updatedAt,
    }));
    if (!(await this.insertRows(client, "ops_project_wireframe_blocks", wireframeRows))) return false;

    const flowStepRows = asArray<PlanningFlow>(planning.userFlows).flatMap((flow) =>
      asArray<Record<string, unknown>>(flow.steps).map((step, index) => ({
        id: step.id,
        project_id: projectId,
        flow_id: flow.id,
        page_id: step.pageId || null,
        action: step.action,
        system_response: step.systemResponse || "",
        next_step_ids: step.nextStepIds || [],
        linked_specification_ids: step.linkedSpecificationIds || [],
        sort_order: index,
        updated_at: record.updatedAt,
      })),
    );

    return this.insertRows(client, "ops_project_user_flow_steps", flowStepRows);
  }

  private async insertRows(client: OpsSupabaseClient, table: string, rows: Array<Record<string, unknown>>) {
    if (!rows.length) return true;
    const { error } = await client.from(table).insert(rows as never[]);
    return !error;
  }

  private mapPrd(row: Record<string, unknown>) {
    return {
      overview: row.overview || "",
      goals: row.goals || [],
      targetUsers: row.target_users || [],
      coreValues: row.core_values || [],
      scenarios: row.scenarios || [],
      successMetrics: row.success_metrics || [],
      risks: row.risks || [],
      openQuestions: row.open_questions || [],
    };
  }

  private mapRequirement(row: Record<string, unknown>) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      source: row.source,
    };
  }

  private mapFeature(row: Record<string, unknown>) {
    return {
      id: row.id,
      requirementId: row.requirement_id,
      title: row.title,
      description: row.description,
      userRoleIds: row.user_role_ids || [],
      status: row.status,
      source: row.source,
    };
  }

  private mapSpecification(row: Record<string, unknown>) {
    return {
      id: row.id,
      featureId: row.feature_id,
      title: row.title,
      behavior: row.behavior,
      acceptanceCriteria: row.acceptance_criteria || [],
      edgeCases: row.edge_cases || [],
      linkedPageIds: row.linked_page_ids || [],
      linkedApiIds: row.linked_api_ids || [],
      evidenceIds: row.evidence_ids || [],
      status: row.status,
      source: row.source,
    };
  }

  private mapIaPage(row: Record<string, unknown>) {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      route: row.route || undefined,
      depth: row.depth,
      parentId: row.parent_id || undefined,
      description: row.description,
      linkedSpecificationIds: row.linked_specification_ids || [],
      linkedUserFlowStepIds: row.linked_user_flow_step_ids || [],
      linkedWireframeBlockIds: row.linked_wireframe_block_ids || [],
      evidenceIds: row.evidence_ids || [],
      source: row.source,
      confidence: row.confidence || undefined,
    };
  }

  private mapUserFlow(row: Record<string, unknown>, steps: PlanningItem[]) {
    return {
      id: row.id,
      title: row.title,
      actorRoleId: row.actor_role_id || undefined,
      status: row.status,
      source: row.source,
      steps,
    };
  }

  private mapFlowStep(row: Record<string, unknown>) {
    return {
      id: row.id,
      pageId: row.page_id || undefined,
      action: row.action,
      systemResponse: row.system_response,
      nextStepIds: row.next_step_ids || [],
      linkedSpecificationIds: row.linked_specification_ids || [],
    };
  }

  private mapWireframe(row: Record<string, unknown>) {
    return {
      id: row.id,
      pageId: row.page_id,
      sectionName: row.section_name,
      layoutType: row.layout_type,
      contentPurpose: row.content_purpose,
      linkedSpecificationIds: row.linked_specification_ids || [],
      evidenceIds: row.evidence_ids || [],
      order: row.sort_order,
      source: row.source,
    };
  }

  private mapArchitecture(row: Record<string, unknown>) {
    return {
      id: row.id,
      projectId: row.project_id,
      kind: row.kind,
      label: row.label,
      description: row.description,
      codeRefs: row.code_refs || [],
      apiLinks: row.api_links || [],
      evidenceIds: row.evidence_ids || [],
      source: row.source,
      confidence: row.confidence || undefined,
    };
  }

  private mapEvidence(row: Record<string, unknown>) {
    return {
      id: row.id,
      repo: row.repo,
      branch: row.branch,
      path: row.path,
      evidenceType: row.evidence_type,
      summary: row.summary,
      imports: row.imports || [],
      apiCalls: row.api_calls || [],
      headings: row.headings || [],
      confidence: row.confidence,
    };
  }
}
