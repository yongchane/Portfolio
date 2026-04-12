import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getOpsDataMode, getSupabaseAdminClient, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import type { Project, ProjectStage, ProgressState, Task, TaskStatus } from "@/lib/ops/types";

const tasksPath = path.join(process.cwd(), "data", "ops", "tasks.json");
const projectsPath = path.join(process.cwd(), "data", "ops", "projects.json");

type MutationBackend = "supabase" | "local";

type SupabaseMaybeSingleResult = Promise<{ data: unknown; error: { message: string } | null }>;
type SupabaseSelectChain = {
  eq: (column: string, value: string) => {
    maybeSingle: () => SupabaseMaybeSingleResult;
  };
};
type SupabaseUpdateChain = {
  eq: (column: string, value: string) => {
    select: (columns: string) => {
      maybeSingle: () => SupabaseMaybeSingleResult;
    };
  };
};
type MinimalMutationSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => SupabaseSelectChain;
    update: (row: unknown) => SupabaseUpdateChain;
  };
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function nowStamp() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date()).replace("T", " ");
}

async function resolveMutationBackend(): Promise<MutationBackend> {
  const mode = getOpsDataMode();
  if (mode === "local") return "local";

  const client = getSupabaseAdminClient();
  if (!client) {
    if (mode === "supabase") {
      throw new Error("Supabase admin client is not configured.");
    }
    return "local";
  }

  const diagnostics = await getSupabaseOpsDiagnostics();
  if (diagnostics.available) {
    return "supabase";
  }

  if (mode === "supabase") {
    throw new Error("Supabase ops tables are not reachable.");
  }

  return "local";
}

export async function updateTask(input: {
  id: string;
  status?: TaskStatus;
  summary?: string;
  nextActions?: string[];
  needsDecision?: string[];
}) {
  const backend = await resolveMutationBackend();
  if (backend === "supabase") {
    return updateTaskInSupabase(input);
  }
  return updateTaskInLocalJson(input);
}

async function updateTaskInLocalJson(input: {
  id: string;
  status?: TaskStatus;
  summary?: string;
  nextActions?: string[];
  needsDecision?: string[];
}) {
  const tasks = await readJsonFile<Task[]>(tasksPath);
  const index = tasks.findIndex((task) => task.id === input.id);
  if (index === -1) throw new Error("Task not found");

  const current = tasks[index];
  tasks[index] = {
    ...current,
    status: input.status ?? current.status,
    summary: input.summary ?? current.summary,
    nextActions: input.nextActions ?? current.nextActions,
    needsDecision: input.needsDecision ?? current.needsDecision,
    updatedAt: nowStamp(),
  };

  await writeJsonFile(tasksPath, tasks);
  return tasks[index];
}

async function updateTaskInSupabase(input: {
  id: string;
  status?: TaskStatus;
  summary?: string;
  nextActions?: string[];
  needsDecision?: string[];
}) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  const supabase = client as unknown as MinimalMutationSupabaseClient;

  const { data: currentRow, error: readError } = await supabase
    .from("ops_tasks")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  const current = currentRow as Record<string, unknown> | null;
  if (!current) throw new Error("Task not found");

  const nextRow = {
    ...current,
    status: input.status ?? current.status,
    summary: input.summary ?? current.summary,
    next_actions: input.nextActions ?? current.next_actions,
    needs_decision: input.needsDecision ?? current.needs_decision,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedRow, error } = await supabase
    .from("ops_tasks")
    .update(nextRow)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  const data = updatedRow as Record<string, unknown> | null;
  if (!data) throw new Error("Task update failed");

  return {
    id: String(data.id),
    title: String(data.title),
    projectId: String(data.project_id),
    category: data.category as Task["category"],
    status: data.status as TaskStatus,
    summary: String(data.summary),
    completedWork: Array.isArray(data.completed_work) ? data.completed_work as string[] : [],
    nextActions: Array.isArray(data.next_actions) ? data.next_actions as string[] : [],
    relatedDocs: Array.isArray(data.related_docs) ? data.related_docs as string[] : [],
    relatedCommits: Array.isArray(data.related_commits) ? data.related_commits as string[] : [],
    noteIds: Array.isArray(data.note_ids) ? data.note_ids as string[] : [],
    needsDecision: Array.isArray(data.needs_decision) ? data.needs_decision as string[] : [],
    updatedAt: String(data.updated_at),
  } satisfies Task;
}

export async function updateProject(input: {
  id: string;
  stage?: ProjectStage;
  summary?: string;
  checklist?: Array<{ id: string; status: ProgressState }>;
}) {
  const backend = await resolveMutationBackend();
  if (backend === "supabase") {
    return updateProjectInSupabase(input);
  }
  return updateProjectInLocalJson(input);
}

async function updateProjectInLocalJson(input: {
  id: string;
  stage?: ProjectStage;
  summary?: string;
  checklist?: Array<{ id: string; status: ProgressState }>;
}) {
  const projects = await readJsonFile<Project[]>(projectsPath);
  const index = projects.findIndex((project) => project.id === input.id);
  if (index === -1) throw new Error("Project not found");

  const current = projects[index];
  const checklist = current.checklist?.map((item) => {
    const patch = input.checklist?.find((entry) => entry.id === item.id);
    return patch ? { ...item, status: patch.status } : item;
  });

  projects[index] = {
    ...current,
    stage: input.stage ?? current.stage,
    summary: input.summary ?? current.summary,
    checklist,
  };

  await writeJsonFile(projectsPath, projects);
  return projects[index];
}

async function updateProjectInSupabase(input: {
  id: string;
  stage?: ProjectStage;
  summary?: string;
  checklist?: Array<{ id: string; status: ProgressState }>;
}) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  const supabase = client as unknown as MinimalMutationSupabaseClient;

  const { data: currentRow, error: readError } = await supabase
    .from("ops_projects")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  const current = currentRow as Record<string, unknown> | null;
  if (!current) throw new Error("Project not found");

  const currentChecklist = Array.isArray(current.checklist) ? current.checklist as Array<Record<string, unknown>> : [];
  const checklist = currentChecklist.map((item) => {
    const patch = input.checklist?.find((entry) => entry.id === item.id);
    return patch ? { ...item, status: patch.status } : item;
  });

  const nextRow = {
    ...current,
    stage: input.stage ?? current.stage,
    summary: input.summary ?? current.summary,
    checklist,
  };

  const { data: updatedRow, error } = await supabase
    .from("ops_projects")
    .update(nextRow)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  const data = updatedRow as Record<string, unknown> | null;
  if (!data) throw new Error("Project update failed");

  return {
    id: String(data.id),
    name: String(data.name),
    stage: data.stage as ProjectStage,
    summary: String(data.summary),
    repo: typeof data.repo === "string" ? data.repo : undefined,
    branch: typeof data.branch === "string" ? data.branch : undefined,
    deployUrl: typeof data.deploy_url === "string" ? data.deploy_url : undefined,
    docs: Array.isArray(data.docs) ? data.docs as string[] : [],
    sectors: Array.isArray(data.sectors) ? data.sectors as Project["sectors"] : [],
    checklist: Array.isArray(data.checklist) ? data.checklist as Project["checklist"] : [],
    operatingCadence: Array.isArray(data.operating_cadence) ? data.operating_cadence as string[] : [],
    adminSurfaces: Array.isArray(data.admin_surfaces) ? data.admin_surfaces as Project["adminSurfaces"] : [],
    vaultViews: Array.isArray(data.vault_views) ? data.vault_views as string[] : [],
    githubFocus: Array.isArray(data.github_focus) ? data.github_focus as string[] : [],
  } satisfies Project;
}
