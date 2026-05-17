import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { OpsApiKeyGuard } from "./guards/ops-api-key.guard";
import { ContractService } from "./services/contract.service";
import { GitHubLiveService } from "./services/github-live.service";

@UseGuards(OpsApiKeyGuard)
@Controller("ops/github/repositories/:owner/:repo")
export class GitHubController {
  constructor(
    private readonly contract: ContractService,
    private readonly github: GitHubLiveService,
  ) {}

  @Get("tree")
  async getTree(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Query("branch") branch = "HEAD",
  ) {
    const tree = await this.github.getRepoTree(owner, repo, branch);
    const analysis = await this.contract.analyzeRepoStructure({
      files: tree.files.map((file) => file.path),
    });

    return {
      ok: true,
      tree,
      analysis,
    };
  }

  @Post("content")
  @HttpCode(200)
  async getContent(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() body: { paths?: string[]; branch?: string },
  ) {
    const paths = Array.isArray(body?.paths) ? body.paths.filter((item) => typeof item === "string") : [];
    if (!paths.length) {
      throw new BadRequestException("paths are required");
    }

    const result = await this.github.getFileContents(owner, repo, paths, body?.branch || "HEAD");
    const analysis = await this.contract.analyzeRepoStructure({
      files: paths,
      fileContents: result.contents,
    });

    return {
      ok: true,
      ...result,
      analysis,
    };
  }
}
