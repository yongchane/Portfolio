import { Injectable, NotFoundException } from "@nestjs/common";
import { ContractService } from "./contract.service";
import { LocalRepoAnalysisService } from "./local-repo-analysis.service";
import { OpsDataService } from "./ops-data.service";

type ProjectLike = {
  id: string;
  repo?: string;
  branch?: string;
};

type RepoLike = {
  repo: string;
};

@Injectable()
export class PlanningGeneratorService {
  constructor(
    private readonly contract: ContractService,
    private readonly data: OpsDataService,
    private readonly analysis: LocalRepoAnalysisService,
  ) {}

  async generate(projectId: string) {
    const opsData = await this.data.getOpsConsoleData() as {
      projects?: ProjectLike[];
      github?: { repoSnapshots?: RepoLike[] };
    };
    const project = opsData.projects?.find((item) => item.id === projectId);
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const repo = project.repo
      ? opsData.github?.repoSnapshots?.find((item) => item.repo === project.repo)
      : undefined;
    const repoAnalysis = await this.analysis.analyzeProjectRepo(project.repo, project.branch);

    return this.contract.buildPlanningDocumentFromRepoAnalysis({
      project,
      repo,
      analysis: repoAnalysis,
    });
  }
}
