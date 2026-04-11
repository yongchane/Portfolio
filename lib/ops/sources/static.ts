import githubCacheData from "@/data/ops/github-cache.json";
import projectsData from "@/data/ops/projects.json";
import tasksData from "@/data/ops/tasks.json";
import type { GitHubCache, Project, Task } from "@/lib/ops/types";

export const opsProjects = projectsData as Project[];
export const opsTasks = tasksData as Task[];
export const opsGitHubCache = githubCacheData as GitHubCache;
