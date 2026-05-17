import { Controller, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { OpsApiKeyGuard } from "./guards/ops-api-key.guard";
import { ContractService } from "./services/contract.service";
import { ExportStoreService } from "./services/export-store.service";
import { OpsDataService } from "./services/ops-data.service";
import { PlanningGeneratorService } from "./services/planning-generator.service";
import { PlanningStoreService } from "./services/planning-store.service";

type ProjectLike = {
  id: string;
  repo?: string;
};

type RepoLike = {
  repo: string;
};

type Deliverable = {
  exportType: string;
  format: string;
  filename: string;
  mimeType: string;
  generatedAt: string;
  content: string;
};

@UseGuards(OpsApiKeyGuard)
@Controller("ops/projects/:id/export")
export class ProjectExportController {
  constructor(
    private readonly data: OpsDataService,
    private readonly planningStore: PlanningStoreService,
    private readonly planningGenerator: PlanningGeneratorService,
    private readonly contract: ContractService,
    private readonly exportStore: ExportStoreService,
  ) {}

  @Post(":exportType")
  @HttpCode(200)
  async exportPlanning(@Param("id") id: string, @Param("exportType") exportType: string) {
    const opsData = await this.data.getOpsConsoleData() as {
      projects?: ProjectLike[];
      github?: { repoSnapshots?: RepoLike[] };
    };
    const project = opsData.projects?.find((item) => item.id === id);
    const repo = project?.repo
      ? opsData.github?.repoSnapshots?.find((item) => item.repo === project.repo)
      : undefined;
    const stored = await this.planningStore.get(id);
    const planning = stored?.planning || await this.planningGenerator.generate(id);
    const generatedAt = new Date().toISOString();
    const deliverable = await this.contract.buildPlanningDeliverable({
      project,
      repo,
      planning,
      type: exportType,
      generatedAt,
    }) as Deliverable;
    const exportRecord = await this.exportStore.save(id, deliverable);

    return {
      ok: true,
      projectId: id,
      exportType: deliverable.exportType,
      format: deliverable.format,
      filename: deliverable.filename,
      mimeType: deliverable.mimeType,
      generatedAt: deliverable.generatedAt,
      content: deliverable.content,
      exportId: exportRecord.id,
    };
  }
}
