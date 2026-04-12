"use client";

import clsx from "clsx";
import { EmptyLine, EmptyState, InfoTile, Panel, noteTypeMeta } from "@/components/ops/shared";
import type { NotesSectionProps } from "@/components/ops/sections/types";

function buildNoteSections(rawExcerpt: string) {
  const lines = rawExcerpt.split("\n");
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let current = { heading: "Overview", lines: [] as string[] };

  for (const line of lines) {
    if (line.startsWith("#")) {
      if (current.lines.length || sections.length === 0) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, "").trim() || "Untitled", lines: [] };
      continue;
    }
    if (line.trim()) current.lines.push(line.trim());
  }

  if (current.lines.length) sections.push(current);
  return sections.filter((section) => section.lines.length);
}


function getNoteArtifacts(noteId: string, artifacts: NotesSectionProps["data"]["artifacts"]) {
  return artifacts.filter((artifact) => artifact.noteId === noteId || artifact.linkedNoteIds.includes(noteId));
}

function findRelatedNotes(noteId: string, vaultLinksByNoteId: NotesSectionProps["vaultLinksByNoteId"], notesById: NotesSectionProps["notesById"]) {
  const stats = vaultLinksByNoteId.get(noteId);
  const ids = [...(stats?.linksTo || []), ...(stats?.linkedBy || [])];
  return [...new Set(ids)].map((id) => notesById.get(id)).filter(Boolean);
}

export function NotesSection({ data, notesById, setSection, setSelectedNoteId, filteredNotes, selectedNote, noteQuery, setNoteQuery, vaultLinksByNoteId }: NotesSectionProps) {
  const noteSections = selectedNote ? buildNoteSections(selectedNote.rawExcerpt) : [];
  const relatedNotes = selectedNote ? findRelatedNotes(selectedNote.id, vaultLinksByNoteId, notesById) : [];
  const noteArtifacts = selectedNote ? getNoteArtifacts(selectedNote.id, data.artifacts) : [];

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Notes</p>
        <h2 className="mb-3 text-4xl font-bold">Vault / Notes Console</h2>
        <p className="max-w-3xl text-white/70">Obsidian/문서 원본을 live source로 읽고, note 간 링크/폴더/태그/작업 연결까지 함께 보여줍니다. 이제 `/ops`의 Notes는 단순 viewer가 아니라 vault operating layer 역할을 합니다.</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-[320px_360px_1fr]">
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">Vault health</p>
            <div className="grid gap-3">
              <InfoTile label="Templates" value={String(data.vault.templatesCount)} />
              <InfoTile label="Project mapped" value={String(data.vault.projectMappedCount)} />
              <InfoTile label="Orphan notes" value={String(data.vault.orphanNoteIds.length)} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">노트 검색</label>
            <input
              value={noteQuery}
              onChange={(event) => setNoteQuery(event.target.value)}
              placeholder="제목, 태그, 경로, 내용 검색"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
            />
            <p className="mt-2 text-xs text-white/45">{filteredNotes.length} / {data.notes.length}개 노트 표시 · synced {data.dataSource.generatedAt || "미기록"}</p>
          </div>
          <div className="max-h-[62vh] space-y-3 overflow-auto pr-1">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={clsx(
                  "w-full rounded-3xl border p-4 text-left transition",
                  selectedNote?.id === note.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong>{note.title}</strong>
                  <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[note.type].tone)}>{noteTypeMeta[note.type].label}</span>
                </div>
                <p className="mb-2 line-clamp-3 text-sm text-white/70">{note.summary}</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">#{tag}</span>
                  ))}
                </div>
                <p className="truncate text-xs text-white/45">{note.path}</p>
              </button>
            ))}
            {!filteredNotes.length && <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">검색 조건에 맞는 노트가 없습니다. 다른 키워드를 시도해 주세요.</div>}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <Panel title="Folder buckets">
            <div className="space-y-3">
              {data.vault.folders.slice(0, 8).map((folder) => (
                <div key={folder.folder} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate">{folder.folder}</strong>
                    <span className="text-xs text-white/45">{folder.count}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/45">{folder.noteIds.slice(0, 3).join(", ")}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Popular tags">
            <div className="flex flex-wrap gap-2">
              {data.vault.tags.map((tag) => (
                <button key={tag.tag} onClick={() => setNoteQuery(tag.tag)} className="rounded-full bg-black/20 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10">#{tag.tag} · {tag.count}</button>
              ))}
            </div>
          </Panel>
          <Panel title="Orphan notes">
            <div className="space-y-2">
              {data.vault.orphanNoteIds.slice(0, 6).map((noteId) => {
                const note = notesById.get(noteId);
                if (!note) return null;
                return (
                  <button key={noteId} onClick={() => setSelectedNoteId(noteId)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left text-sm text-white/75 transition hover:bg-white/10">
                    {note.title}
                  </button>
                );
              })}
              {!data.vault.orphanNoteIds.length && <EmptyLine message="모든 노트가 task/project/link 중 하나 이상에 연결되어 있습니다." />}
            </div>
          </Panel>
        </div>

        {selectedNote ? (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h3 className="text-3xl font-bold">{selectedNote.title}</h3>
              <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[selectedNote.type].tone)}>{noteTypeMeta[selectedNote.type].label}</span>
            </div>
            <p className="text-sm text-white/45">{selectedNote.path} · {selectedNote.updatedAt}</p>
            <p className="text-white/75">{selectedNote.summary}</p>

            <div className="grid gap-4 text-sm text-white/75 md:grid-cols-3">
              <InfoTile label="Project" value={selectedNote.project || "-"} />
              <InfoTile label="Folder" value={selectedNote.folder} />
              <InfoTile label="Tags" value={selectedNote.tags.length ? selectedNote.tags.join(", ") : "-"} />
              <InfoTile label="Headings" value={selectedNote.headings.length ? selectedNote.headings.join(" · ") : "-"} />
              <InfoTile label="Highlights" value={String(selectedNote.highlights.length)} />
              <InfoTile label="Typed artifacts" value={String(noteArtifacts.length)} />
              <InfoTile label="Vault graph" value={`out ${vaultLinksByNoteId.get(selectedNote.id)?.linksTo.length || 0} · in ${vaultLinksByNoteId.get(selectedNote.id)?.linkedBy.length || 0}`} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-sm font-semibold text-white/55">Reading map</p>
                <div className="space-y-2 text-sm text-white/80">
                  {noteSections.map((section) => (
                    <a key={section.heading} href={`#note-section-${encodeURIComponent(section.heading)}`} className="block rounded-xl bg-white/5 px-3 py-2 transition hover:bg-white/10">
                      {section.heading}
                    </a>
                  ))}
                  {!noteSections.length && <EmptyLine message="섹션으로 나눌 heading이 없습니다." />}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-3 text-sm font-semibold text-white/55">핵심 포인트</p>
                <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
                  {(selectedNote.highlights.length ? selectedNote.highlights : selectedNote.preview).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-3 text-sm font-semibold text-white/55">Related notes</p>
                <div className="space-y-2">
                  {relatedNotes.slice(0, 8).map((note) => note ? (
                    <button key={note.id} onClick={() => setSelectedNoteId(note.id)} className="block w-full rounded-2xl bg-white/5 px-3 py-3 text-left text-sm hover:bg-white/10">
                      <strong>{note.title}</strong>
                      <p className="mt-1 text-xs text-white/50">{note.path}</p>
                    </button>
                  ) : null)}
                  {!relatedNotes.length && <EmptyLine message="그래프상 직접 연결된 note가 없습니다." />}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-3 text-sm font-semibold text-white/55">Typed artifacts</p>
                <div className="space-y-3">
                  {noteArtifacts.map((artifact) => (
                    <div key={artifact.id} className="rounded-2xl bg-white/5 px-4 py-3 text-left text-sm text-white/80">
                      <div className="flex items-center justify-between gap-3">
                        <strong>{artifact.title}</strong>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{artifact.artifactType}</span>
                      </div>
                      <p className="mt-2 text-white/65">{artifact.summary}</p>
                    </div>
                  ))}
                  {!noteArtifacts.length && <EmptyLine message="이 노트에서 아직 추출된 typed artifact가 없습니다." />}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-3 text-sm font-semibold text-white/55">연결된 작업</p>
                <div className="space-y-3">
                  {data.tasks.filter((task) => task.noteIds?.includes(selectedNote.id)).map((task) => (
                    <button key={task.id} onClick={() => setSection("tasks")} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{data.projects.find((project) => project.id === task.projectId)?.name || "-"}</p>
                      <strong>{task.title}</strong>
                      <p className="mt-2 text-sm text-white/70">{task.summary}</p>
                    </button>
                  ))}
                  {!data.tasks.some((task) => task.noteIds?.includes(selectedNote.id)) && <p className="text-sm text-white/55">아직 연결된 작업이 없습니다.</p>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-4 text-sm font-semibold text-white/55">Structured detail view</p>
              <div className="space-y-5 text-sm leading-7 text-white/80">
                {noteSections.length ? noteSections.map((section) => (
                  <section key={section.heading} id={`note-section-${encodeURIComponent(section.heading)}`} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h4 className="mb-3 text-lg font-semibold text-white">{section.heading}</h4>
                    <div className="space-y-2">
                      {section.lines.map((line) => (
                        <p key={`${section.heading}-${line}`}>{line.startsWith("-") ? `• ${line.replace(/^-\s*/, "")}` : line}</p>
                      ))}
                    </div>
                  </section>
                )) : <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">{selectedNote.rawExcerpt}</pre>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-3 text-sm font-semibold text-white/55">Vault links</p>
              <div className="grid gap-4 text-sm text-white/80 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">Outgoing</p>
                  <div className="space-y-2">
                    {(vaultLinksByNoteId.get(selectedNote.id)?.linksTo || []).map((noteId) => {
                      const note = notesById.get(noteId);
                      return note ? <button key={noteId} onClick={() => setSelectedNoteId(noteId)} className="block w-full rounded-2xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{note.title}</button> : null;
                    })}
                    {!(vaultLinksByNoteId.get(selectedNote.id)?.linksTo || []).length && <EmptyLine message="연결된 outgoing note가 없습니다." />}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">Backlinks</p>
                  <div className="space-y-2">
                    {(vaultLinksByNoteId.get(selectedNote.id)?.linkedBy || []).map((noteId) => {
                      const note = notesById.get(noteId);
                      return note ? <button key={noteId} onClick={() => setSelectedNoteId(noteId)} className="block w-full rounded-2xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{note.title}</button> : null;
                    })}
                    {!(vaultLinksByNoteId.get(selectedNote.id)?.linkedBy || []).length && <EmptyLine message="아직 이 노트를 참조하는 backlink가 없습니다." />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="노트를 찾지 못했습니다" description={`notes export snapshot을 확인해 주세요. 현재 generated: ${data.dataSource.generatedAt || "미기록"} · root: ${data.dataSource.workspaceRoot || "미설정"} · note count: ${data.dataSource.notesCount}`} />
        )}
      </div>
    </div>
  );
}
