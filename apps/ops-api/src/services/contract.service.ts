import { Injectable } from "@nestjs/common";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { repoRoot } from "./repo-root";

type ContractModule = {
  analyzeRepoStructure(input: { files: string[]; fileContents?: Record<string, string> }): unknown;
  buildProjectCanvasResponse(data: unknown, projectId: string, analysis: unknown): unknown;
  buildCanvasMarkdown(input: {
    project: unknown;
    repo: unknown;
    canvas: unknown;
    generatedAt: string;
  }): string;
  sanitizeCanvasPayload(input: unknown): unknown;
};

type PlanningContractModule = {
  planningExportTypes: string[];
  buildPlanningDocumentFromRepoAnalysis(input: {
    project?: unknown;
    repo?: unknown;
    analysis?: unknown;
    now?: string;
  }): unknown;
  buildPlanningCanvasModel(planning: unknown): unknown;
  buildPlanningDeliverable(input: {
    project?: unknown;
    repo?: unknown;
    planning?: unknown;
    type?: string;
    generatedAt?: string;
  }): unknown;
};

const importEsm = new Function("specifier", "return import(specifier)") as <T>(specifier: string) => Promise<T>;

@Injectable()
export class ContractService {
  private contractPromise?: Promise<ContractModule>;
  private planningContractPromise?: Promise<PlanningContractModule>;

  private loadContract() {
    if (!this.contractPromise) {
      const contractPath = path.join(repoRoot(), "lib", "ops", "project-management-contract.mjs");
      this.contractPromise = importEsm<ContractModule>(pathToFileURL(contractPath).href);
    }

    return this.contractPromise;
  }

  private loadPlanningContract() {
    if (!this.planningContractPromise) {
      const contractPath = path.join(repoRoot(), "lib", "ops", "project-planning-contract.mjs");
      this.planningContractPromise = importEsm<PlanningContractModule>(pathToFileURL(contractPath).href);
    }

    return this.planningContractPromise;
  }

  async analyzeRepoStructure(input: { files: string[]; fileContents?: Record<string, string> }) {
    const contract = await this.loadContract();
    return contract.analyzeRepoStructure(input);
  }

  async buildProjectCanvasResponse(data: unknown, projectId: string, analysis: unknown) {
    const contract = await this.loadContract();
    return contract.buildProjectCanvasResponse(data, projectId, analysis);
  }

  async buildCanvasMarkdown(input: {
    project: unknown;
    repo: unknown;
    canvas: unknown;
    generatedAt: string;
  }) {
    const contract = await this.loadContract();
    return contract.buildCanvasMarkdown(input);
  }

  async sanitizeCanvasPayload(input: unknown) {
    const contract = await this.loadContract();
    return contract.sanitizeCanvasPayload(input);
  }

  async buildPlanningDocumentFromRepoAnalysis(input: {
    project?: unknown;
    repo?: unknown;
    analysis?: unknown;
    now?: string;
  }) {
    const contract = await this.loadPlanningContract();
    return contract.buildPlanningDocumentFromRepoAnalysis(input);
  }

  async buildPlanningCanvasModel(planning: unknown) {
    const contract = await this.loadPlanningContract();
    return contract.buildPlanningCanvasModel(planning);
  }

  async buildPlanningDeliverable(input: {
    project?: unknown;
    repo?: unknown;
    planning?: unknown;
    type?: string;
    generatedAt?: string;
  }) {
    const contract = await this.loadPlanningContract();
    return contract.buildPlanningDeliverable(input);
  }

  async getPlanningExportTypes() {
    const contract = await this.loadPlanningContract();
    return contract.planningExportTypes;
  }
}
