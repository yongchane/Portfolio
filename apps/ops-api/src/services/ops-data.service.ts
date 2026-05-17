import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GitHubLiveService } from "./github-live.service";
import { repoRoot } from "./repo-root";

async function readJson<T>(relativePath: string, fallback: T): Promise<T> {
  const raw = await readFile(path.join(repoRoot(), relativePath), "utf8").catch(() => "");
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  summary: string;
  repo: string | null;
  branch: string | null;
  deploy_url: string | null;
  docs: string[] | null;
  sectors: unknown[] | null;
  checklist: unknown[] | null;
  operating_cadence: string[] | null;
  admin_surfaces: unknown[] | null;
  vault_views: string[] | null;
  github_focus: string[] | null;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string;
  category: string;
  status: string;
  summary: string;
  completed_work: string[] | null;
  next_actions: string[] | null;
  related_docs: string[] | null;
  related_commits: string[] | null;
  note_ids: string[] | null;
  needs_decision: string[] | null;
  updated_at: string;
};

const jsonArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }
  return [];
};

@Injectable()
export class OpsDataService {
  constructor(private readonly github: GitHubLiveService) {}

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

  async getOpsConsoleData() {
    const supabaseData = await this.getSupabaseOpsConsoleData();
    if (supabaseData) return supabaseData;

    const [projects, tasks, github] = await Promise.all([
      readJson("data/ops/projects.json", []),
      readJson("data/ops/tasks.json", []),
      readJson("data/ops/github-cache.json", { repoSnapshots: [] }),
    ]);

    return {
      projects,
      tasks,
      notes: [],
      worklogs: [],
      artifacts: [],
      github,
      vault: null,
      openclaw: null,
      workerHeartbeats: [],
      hostStatuses: [],
      openclawStatuses: [],
      syncRequests: [],
      agents: [],
      agentRuns: [],
      aiReviews: [],
      dataSource: {
        mode: "nest-local",
        generatedAt: new Date().toISOString(),
        workspaceRoot: repoRoot(),
      },
    };
  }

  private async getSupabaseOpsConsoleData() {
    const client = this.getSupabaseClient();
    if (!client) return null;

    const [projectsResult, tasksResult] = await Promise.all([
      client.from("ops_projects").select("*").order("name", { ascending: true }),
      client.from("ops_tasks").select("*").order("updated_at", { ascending: false }),
    ]);

    if (projectsResult.error || tasksResult.error) {
      if (process.env.PORTFOLIO_OPS_DATA_MODE === "supabase") {
        throw new Error(
          `Supabase ops query failed: ${projectsResult.error?.message || tasksResult.error?.message}`,
        );
      }
      return null;
    }

    const projects = ((projectsResult.data || []) as ProjectRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      stage: row.stage,
      summary: row.summary,
      repo: row.repo || undefined,
      branch: row.branch || undefined,
      deployUrl: row.deploy_url || undefined,
      docs: jsonArray<string>(row.docs),
      sectors: jsonArray(row.sectors),
      checklist: jsonArray(row.checklist),
      operatingCadence: jsonArray<string>(row.operating_cadence),
      adminSurfaces: jsonArray(row.admin_surfaces),
      vaultViews: jsonArray<string>(row.vault_views),
      githubFocus: jsonArray<string>(row.github_focus),
    }));
    const tasks = ((tasksResult.data || []) as TaskRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      projectId: row.project_id,
      category: row.category,
      status: row.status,
      summary: row.summary,
      completedWork: jsonArray<string>(row.completed_work),
      nextActions: jsonArray<string>(row.next_actions),
      relatedDocs: jsonArray<string>(row.related_docs),
      relatedCommits: jsonArray<string>(row.related_commits),
      noteIds: jsonArray<string>(row.note_ids),
      needsDecision: jsonArray<string>(row.needs_decision),
      updatedAt: row.updated_at,
    }));
    const github = await this.buildLiveGitHubCache(projects);

    return {
      projects,
      tasks,
      notes: [],
      worklogs: [],
      artifacts: [],
      github,
      vault: null,
      openclaw: null,
      workerHeartbeats: [],
      hostStatuses: [],
      openclawStatuses: [],
      syncRequests: [],
      agents: [],
      agentRuns: [],
      aiReviews: [],
      dataSource: {
        mode: "supabase",
        generatedAt: new Date().toISOString(),
        workspaceRoot: repoRoot(),
        sourceHealth: {
          supabaseConfigured: true,
          supabaseReachable: true,
          activeMode: "supabase",
          preferredMode: process.env.PORTFOLIO_OPS_DATA_MODE || "auto",
          notesMode: "supabase",
        },
      },
    };
  }

  private async buildLiveGitHubCache(projects: Array<{ repo?: string }>) {
    const fallback = await readJson("data/ops/github-cache.json", {
      generatedAt: new Date().toISOString(),
      mode: "fallback",
      repoSnapshots: [],
      releases: [],
      projectBoards: [],
      workflowRuns: [],
      securityAlerts: [],
      warnings: [],
    });
    const repoNames = [...new Set(projects.map((project) => project.repo).filter(Boolean))] as string[];
    if (!repoNames.length) return fallback;

    const repoSnapshots = [];
    const warnings: string[] = [];
    for (const repoName of repoNames) {
      try {
        repoSnapshots.push(await this.github.getRepoSnapshot(repoName));
      } catch (error) {
        warnings.push(`${repoName}: ${error instanceof Error ? error.message : "repo metadata fetch failed"}`);
        const cached = (fallback as { repoSnapshots?: Array<{ repo: string }> }).repoSnapshots?.find((repo) => repo.repo === repoName);
        if (cached) repoSnapshots.push(cached);
      }
    }

    return {
      ...(fallback as Record<string, unknown>),
      generatedAt: new Date().toISOString(),
      mode: "live",
      repoSnapshots,
      warnings,
    };
  }
}
