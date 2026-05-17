import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OpsApiKeyGuard } from "./guards/ops-api-key.guard";
import { CanvasStoreService } from "./services/canvas-store.service";
import { PlanningGeneratorService } from "./services/planning-generator.service";
import { PlanningStoreService } from "./services/planning-store.service";
import { SuggestionStoreService } from "./services/suggestion-store.service";

@UseGuards(OpsApiKeyGuard)
@Controller("ops/projects/:id")
export class ProjectPlanningController {
  constructor(
    private readonly generator: PlanningGeneratorService,
    private readonly store: PlanningStoreService,
    private readonly canvasStore: CanvasStoreService,
    private readonly suggestions: SuggestionStoreService,
  ) {}

  @Get("planning")
  async getPlanning(@Param("id") id: string) {
    const stored = await this.store.get(id);
    const planning = stored?.planning || await this.generator.generate(id);

    return {
      ok: true,
      projectId: id,
      source: stored ? "saved-planning" : "generated-planning",
      planning,
      savedAt: stored?.updatedAt,
    };
  }

  @Post("planning/generate")
  @HttpCode(200)
  async generatePlanning(@Param("id") id: string) {
    const planning = await this.generator.generate(id);
    const stored = await this.store.save(id, planning);
    const canvas = (stored.planning as { canvas?: unknown }).canvas;
    if (canvas && typeof canvas === "object") {
      await this.canvasStore.save(id, canvas);
    }

    return {
      ok: true,
      projectId: id,
      source: "generated-planning",
      planning: stored.planning,
      canvas: stored.planning.canvas,
      savedAt: stored.updatedAt,
    };
  }

  @Patch("planning")
  async savePlanning(@Param("id") id: string, @Body() body: { planning?: unknown }) {
    const stored = await this.store.save(id, body?.planning ?? body);

    return {
      ok: true,
      projectId: id,
      source: "saved-planning",
      planning: stored.planning,
      savedAt: stored.updatedAt,
    };
  }

  @Get("ia")
  async getIa(@Param("id") id: string) {
    const planning = await this.getPlanningDocument(id);
    return { ok: true, projectId: id, iaPages: planning.iaPages || [] };
  }

  @Get("specifications")
  async getSpecifications(@Param("id") id: string) {
    const planning = await this.getPlanningDocument(id);
    return {
      ok: true,
      projectId: id,
      requirements: planning.requirements || [],
      features: planning.features || [],
      specifications: planning.specifications || [],
    };
  }

  @Get("architecture")
  async getArchitecture(@Param("id") id: string) {
    const planning = await this.getPlanningDocument(id);
    return { ok: true, projectId: id, architecture: planning.architecture || [] };
  }

  @Get("user-flows")
  async getUserFlows(@Param("id") id: string) {
    const planning = await this.getPlanningDocument(id);
    return { ok: true, projectId: id, userFlows: planning.userFlows || [] };
  }

  @Get("wireframes")
  async getWireframes(@Param("id") id: string) {
    const planning = await this.getPlanningDocument(id);
    return { ok: true, projectId: id, wireframes: planning.wireframes || [] };
  }

  @Get("evidence")
  async getEvidence(@Param("id") id: string) {
    const planning = await this.getPlanningDocument(id);
    return { ok: true, projectId: id, evidence: planning.evidence || [] };
  }

  @Get("suggestions")
  async getSuggestions(@Param("id") id: string) {
    const suggestions = await this.suggestions.list(id);
    return { ok: true, projectId: id, suggestions };
  }

  @Post("suggestions")
  @HttpCode(200)
  async createSuggestion(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const suggestion = await this.suggestions.create(id, body || {});
    return { ok: true, projectId: id, suggestion };
  }

  @Post("suggestions/generate")
  @HttpCode(200)
  async generateSuggestions(@Param("id") id: string) {
    const suggestions = await this.suggestions.generate(id);
    return { ok: true, projectId: id, suggestions };
  }

  @Post("suggestions/:suggestionId/approve")
  @HttpCode(200)
  async approveSuggestion(@Param("id") id: string, @Param("suggestionId") suggestionId: string) {
    const result = await this.suggestions.approve(id, suggestionId);
    return result
      ? { ok: true, projectId: id, ...result }
      : { ok: false, projectId: id, message: "Suggestion not found" };
  }

  @Post("suggestions/:suggestionId/reject")
  @HttpCode(200)
  async rejectSuggestion(@Param("id") id: string, @Param("suggestionId") suggestionId: string) {
    const result = await this.suggestions.reject(id, suggestionId);
    return result
      ? { ok: true, projectId: id, ...result }
      : { ok: false, projectId: id, message: "Suggestion not found" };
  }

  private async getPlanningDocument(id: string) {
    const stored = await this.store.get(id);
    return stored?.planning || await this.generator.generate(id) as {
      iaPages?: unknown[];
      requirements?: unknown[];
      features?: unknown[];
      specifications?: unknown[];
      architecture?: unknown[];
      userFlows?: unknown[];
      wireframes?: unknown[];
      evidence?: unknown[];
    };
  }
}
