import githubCacheData from "@/data/ops/github-cache.json";
import projectsData from "@/data/ops/projects.json";
import tasksData from "@/data/ops/tasks.json";
import { getNotesSourceData } from "@/lib/ops/notes-source";
import { getSupabaseOpsConsoleData } from "@/lib/ops/supabase-data";
import { getOpsDataMode, getSupabaseOpsDiagnostics } from "@/lib/ops/supabase";
import type { GitHubCache, NoteItem, OpsConsoleData, OpsSourceHealth, Project, Task, VaultSummary } from "@/lib/ops/types";

const projects = projectsData as Project[];
const tasks = tasksData as Task[];
const github = githubCacheData as GitHubCache;

export async function getOpsConsoleData(): Promise<OpsConsoleData> {
  const [supabaseData, diagnostics] = await Promise.all([
    getSupabaseOpsConsoleData(),
    getSupabaseOpsDiagnostics(),
  ]);

  if (supabaseData) {
    return {
      ...supabaseData,
      github,
      vault: buildVaultSummary(supabaseData.notes),
      dataSource: {
        ...supabaseData.dataSource,
        sourceHealth: {
          ...supabaseData.dataSource.sourceHealth,
          supabaseConfigured: diagnostics.configured,
          supabaseReachable: diagnostics.available,
        },
      },
    };
  }

  const notesSource = await getNotesSourceData();
  const preferredMode = getOpsDataMode();
  const sourceHealth: OpsSourceHealth = {
    supabaseConfigured: diagnostics.configured,
    supabaseReachable: diagnostics.available,
    activeMode: notesSource.mode,
    preferredMode,
    notesMode: notesSource.mode,
    lastSyncStatus: diagnostics.available ? "succeeded" : undefined,
    lastSyncMessage: diagnostics.configured
      ? (diagnostics.available ? "Supabase configured but inactive for current request." : "Supabase env exists but ops tables are not reachable yet.")
      : "Supabase env not configured. Using local/export notes path.",
  };

  return {
    projects,
    tasks,
    notes: notesSource.notes,
    github,
    vault: buildVaultSummary(notesSource.notes),
    dataSource: {
      mode: notesSource.mode,
      generatedAt: notesSource.generatedAt,
      workspaceRoot: notesSource.workspaceRoot,
      notesRoots: notesSource.notesRoots,
      resolvedRoots: notesSource.resolvedRoots,
      notesCount: notesSource.notes.length,
      sourceHealth,
    },
  };
}

function buildVaultSummary(notes: NoteItem[]): VaultSummary {
  const folders = new Map<string, { folder: string; count: number; noteIds: string[] }>();
  const tags = new Map<string, number>();
  const linkAliases = buildLinkAliases(notes);
  const incomingLinks = new Map<string, Set<string>>();

  for (const note of notes) {
    const folder = note.folder || "(root)";
    const folderEntry = folders.get(folder) || { folder, count: 0, noteIds: [] };
    folderEntry.count += 1;
    folderEntry.noteIds.push(note.id);
    folders.set(folder, folderEntry);

    for (const tag of note.tags) {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    }

    for (const link of note.links || []) {
      const targets = resolveLinkTargets(link, linkAliases);
      for (const targetId of targets) {
        const linkedBy = incomingLinks.get(targetId) || new Set<string>();
        linkedBy.add(note.id);
        incomingLinks.set(targetId, linkedBy);
      }
    }
  }

  const links = notes.map((note) => {
    const outgoing = new Set<string>();
    for (const link of note.links || []) {
      for (const targetId of resolveLinkTargets(link, linkAliases)) {
        if (targetId !== note.id) outgoing.add(targetId);
      }
    }

    return {
      noteId: note.id,
      title: note.title,
      linksTo: [...outgoing],
      linkedBy: [...(incomingLinks.get(note.id) || new Set<string>())],
    };
  });

  return {
    notesCount: notes.length,
    templatesCount: notes.filter((note) => /templates\//i.test(note.path)).length,
    rootCount: new Set(notes.map((note) => note.workspaceRootLabel)).size,
    projectMappedCount: notes.filter((note) => Boolean(note.project)).length,
    orphanNoteIds: links.filter((item) => item.linksTo.length === 0 && item.linkedBy.length === 0).map((item) => item.noteId),
    folders: [...folders.values()].sort((a, b) => b.count - a.count || a.folder.localeCompare(b.folder)),
    tags: [...tags.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)).slice(0, 16),
    links,
  };
}

function buildLinkAliases(notes: NoteItem[]) {
  const aliases = new Map<string, Set<string>>();

  for (const note of notes) {
    addAlias(aliases, note.id, note.id);
    addAlias(aliases, note.path, note.id);
    addAlias(aliases, stripExtension(note.path), note.id);
    addAlias(aliases, note.title, note.id);
    addAlias(aliases, pathBasename(note.path), note.id);
    addAlias(aliases, stripExtension(pathBasename(note.path)), note.id);
  }

  return aliases;
}

function addAlias(map: Map<string, Set<string>>, rawAlias: string, noteId: string) {
  const alias = normalizeAlias(rawAlias);
  if (!alias) return;
  const entry = map.get(alias) || new Set<string>();
  entry.add(noteId);
  map.set(alias, entry);
}

function resolveLinkTargets(link: string, aliases: Map<string, Set<string>>) {
  const direct = aliases.get(normalizeAlias(link));
  if (direct?.size) return [...direct];

  const basename = aliases.get(normalizeAlias(pathBasename(link)));
  return basename ? [...basename] : [];
}

function normalizeAlias(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\.mdx?$/i, "")
    .trim()
    .toLowerCase();
}

function stripExtension(value: string) {
  return value.replace(/\.mdx?$/i, "");
}

function pathBasename(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || normalized;
}
