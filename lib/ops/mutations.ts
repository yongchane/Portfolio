import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Project, ProjectStage, ProgressState, Task, TaskStatus } from "@/lib/ops/types";

const tasksPath = path.join(process.cwd(), "data", "ops", "tasks.json");
const projectsPath = path.join(process.cwd(), "data", "ops", "projects.json");

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

export async function updateTask(input: {
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

export async function updateProject(input: {
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
