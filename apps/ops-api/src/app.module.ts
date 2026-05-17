import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { GitHubController } from "./github.controller";
import { ProjectCanvasController } from "./project-canvas.controller";
import { ProjectExportController } from "./project-export.controller";
import { ProjectPlanningController } from "./project-planning.controller";
import { CanvasStoreService } from "./services/canvas-store.service";
import { ContractService } from "./services/contract.service";
import { ExportStoreService } from "./services/export-store.service";
import { GitHubLiveService } from "./services/github-live.service";
import { LocalRepoAnalysisService } from "./services/local-repo-analysis.service";
import { OpsDataService } from "./services/ops-data.service";
import { PlanningGeneratorService } from "./services/planning-generator.service";
import { PlanningStoreService } from "./services/planning-store.service";
import { SuggestionStoreService } from "./services/suggestion-store.service";

@Module({
  controllers: [HealthController, GitHubController, ProjectCanvasController, ProjectExportController, ProjectPlanningController],
  providers: [
    CanvasStoreService,
    ContractService,
    ExportStoreService,
    GitHubLiveService,
    LocalRepoAnalysisService,
    OpsDataService,
    PlanningGeneratorService,
    PlanningStoreService,
    SuggestionStoreService,
  ],
})
export class AppModule {}
