import { Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OpsApiKeyGuard } from "./guards/ops-api-key.guard";
import { CanvasStoreService } from "./services/canvas-store.service";
import { ContractService } from "./services/contract.service";
import { LocalRepoAnalysisService } from "./services/local-repo-analysis.service";
import { OpsDataService } from "./services/ops-data.service";

type CanvasResponse = {
  project?: { repo?: string };
  repo?: unknown;
  canvas?: unknown;
  source?: string;
};

@UseGuards(OpsApiKeyGuard)
@Controller("ops/projects/:id/canvas")
export class ProjectCanvasController {
  constructor(
    private readonly data: OpsDataService,
    private readonly analysis: LocalRepoAnalysisService,
    private readonly canvasStore: CanvasStoreService,
    private readonly contract: ContractService,
  ) {}

  @Get()
  async getCanvas(@Param("id") id: string) {
    const opsData = await this.data.getOpsConsoleData();
    const response = await this.buildCanvasResponse(opsData, id);
    const stored = await this.canvasStore.get(id);

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      ...response,
      source: stored ? "saved-canvas" : response.source,
      canvas: stored?.canvas ?? response.canvas,
      savedAt: stored?.updatedAt,
    };
  }

  @Patch()
  async saveCanvas(@Param("id") id: string, @Body() body: { canvas?: unknown }) {
    const opsData = await this.data.getOpsConsoleData();
    await this.buildCanvasResponse(opsData, id);
    const stored = await this.canvasStore.save(id, body?.canvas ?? body);

    return {
      ok: true,
      projectId: id,
      source: "saved-canvas",
      canvas: stored.canvas,
      savedAt: stored.updatedAt,
    };
  }

  @Post("export")
  @HttpCode(200)
  async exportCanvas(@Param("id") id: string, @Body() body: { canvas?: unknown }) {
    const opsData = await this.data.getOpsConsoleData();
    const response = await this.buildCanvasResponse(opsData, id);
    const stored = await this.canvasStore.get(id);
    const generatedAt = new Date().toISOString();
    const markdown = await this.contract.buildCanvasMarkdown({
      project: response.project,
      repo: response.repo,
      canvas: body?.canvas && typeof body.canvas === "object" ? body.canvas : stored?.canvas ?? response.canvas,
      generatedAt,
    });

    return {
      ok: true,
      filename: `${id}-canvas.md`,
      generatedAt,
      markdown,
    };
  }

  private async buildCanvasResponse(opsData: unknown, id: string): Promise<CanvasResponse> {
    const project = (opsData as { projects?: Array<{ id: string; repo?: string }> }).projects?.find((item) => item.id === id);
    const repoAnalysis = await this.analysis.analyzeProjectRepo(project?.repo, (project as { branch?: string } | undefined)?.branch);
    const response = await this.contract.buildProjectCanvasResponse(opsData, id, repoAnalysis) as CanvasResponse | null;
    if (!response) {
      throw new NotFoundException("Project canvas not found");
    }

    return response;
  }
}
