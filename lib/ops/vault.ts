import type { NoteItem, VaultSummary } from "@/lib/ops/types";

export function buildVaultSummary(notes: NoteItem[]): VaultSummary {
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
