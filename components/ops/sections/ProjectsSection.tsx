"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { EmptyLine, GitHubRepoDetail, InfoTile, Panel, ProjectBoardCard, ReleaseCard, TaskRow, SectorRow, ChecklistRow, projectStageMeta } from "@/components/ops/shared";
import type { ProjectsSectionProps } from "@/components/ops/sections/types";
import type { ProgressState, ProjectStage } from "@/lib/ops/types";

function extractProjectBoardScopeWarning(warnings: string[] | undefined, owner?: string) {
  return warnings?.find((warning) => warning.includes("read:project") && (!owner || warning.includes(`projects(${owner})`)));
}

export function ProjectsSection({ data, notesById, setSection, setSelectedProjectId, setSelectedNoteId, selectedProject, projectTasks, selectedRepo, selectedProjectBoards, selectedProjectReleases, selectedProjectNotes, projectRepoHealth, vaultLinksByNoteId }: ProjectsSectionProps) {
  const router = useRouter();
  const [summaryDraft, setSummaryDraft] = useState(selectedProject.summary);
  const [stageDraft, setStageDraft] = useState<ProjectStage>(selectedProject.stage);
  const [checklistDraft, setChecklistDraft] = useState<Record<string, ProgressState>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const checklistPayload = useMemo(() => (selectedProject.checklist || []).map((item) => ({
    id: item.id,
    status: checklistDraft[item.id] || item.status,
  })), [selectedProject.checklist, checklistDraft]);

  const boardScopeWarning = extractProjectBoardScopeWarning(data.github.warnings, selectedRepo?.owner);

  useEffect(() => {
    setSummaryDraft(selectedProject.summary);
    setStageDraft(selectedProject.stage);
    setChecklistDraft({});
    setSaveMessage(null);
  }, [selectedProject.id, selectedProject.stage, selectedProject.summary]);

  async function saveProject() {
    setSaveMessage(null);
    const response = await fetch(`/api/ops/projects/${selectedProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: stageDraft,
        summary: summaryDraft,
        checklist: checklistPayload,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setSaveMessage(payload?.message || "프로젝트 저장에 실패했습니다.");
      return;
    }

    setSaveMessage(data.dataSource.mode === "supabase" ? "Supabase에 반영했고 화면을 새로고침합니다." : "로컬 fallback source에 반영했고 화면을 새로고침합니다.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Projects</p>
        <h2 className="mb-3 text-4xl font-bold">프로젝트 운영 관리</h2>
        <p className="max-w-3xl text-white/70">기획 → 개발 → 배포 → 운영 흐름을 프로젝트 단위로 관리합니다. sector progress, spec checklist, GitHub repo 상태를 한 화면에서 봅니다.</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          {data.projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={clsx(
                "w-full rounded-3xl border p-4 text-left transition",
                selectedProject.id === project.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <strong className="text-lg">{project.name}</strong>
                <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", projectStageMeta[project.stage].tone)}>{projectStageMeta[project.stage].label}</span>
              </div>
              <p className="text-sm text-white/70">{project.summary}</p>
            </button>
          ))}
        </div>
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="text-3xl font-bold">{selectedProject.name}</h3>
              <p className="mt-2 max-w-3xl text-white/70">{selectedProject.summary}</p>
            </div>
            <span className={clsx("rounded-full px-3 py-1 text-sm font-semibold", projectStageMeta[selectedProject.stage].tone)}>{projectStageMeta[selectedProject.stage].label}</span>
          </div>

          <div className="grid gap-4 text-sm text-white/75 md:grid-cols-2 xl:grid-cols-8">
            <InfoTile label="Repository" value={selectedProject.repo || "-"} />
            <InfoTile label="Branch" value={selectedProject.branch || "-"} />
            <InfoTile label="Deploy" value={selectedProject.deployUrl || "-"} />
            <InfoTile label="Docs" value={selectedProject.docs?.join(", ") || "-"} />
            <InfoTile label="Linked notes" value={String(selectedProjectNotes.length)} />
            <InfoTile label="Connected tasks" value={String(projectTasks.length)} />
            <InfoTile label="Boards / releases" value={`${selectedProjectBoards.length} / ${selectedProjectReleases.length}`} />
            <InfoTile label="Repo health" value={projectRepoHealth ? `${projectRepoHealth.score}/100` : "-"} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Project write path (MVP)">
              <div className="space-y-4 text-sm text-white/80">
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-xs leading-6 text-emerald-50/90">
                  현재는 인증된 `/ops`에서만 project stage / summary / checklist를 수정합니다. Supabase가 연결되면 `ops_projects`에 직접 반영하고, 미연결 환경에서만 로컬 fallback source를 수정합니다.
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Stage</span>
                  <select value={stageDraft} onChange={(event) => setStageDraft(event.target.value as ProjectStage)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none">
                    <option value="idea">idea</option>
                    <option value="planning">planning</option>
                    <option value="building">building</option>
                    <option value="verifying">verifying</option>
                    <option value="live">live</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Summary</span>
                  <textarea value={summaryDraft} onChange={(event) => setSummaryDraft(event.target.value)} rows={5} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
                </label>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Checklist quick updates</p>
                  <div className="space-y-3">
                    {(selectedProject.checklist || []).map((item) => {
                      const value = checklistDraft[item.id] || item.status;
                      return (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <strong>{item.label}</strong>
                            <select value={value} onChange={(event) => setChecklistDraft((current) => ({ ...current, [item.id]: event.target.value as ProgressState }))} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none">
                              <option value="todo">todo</option>
                              <option value="doing">doing</option>
                              <option value="done">done</option>
                              <option value="blocked">blocked</option>
                            </select>
                          </div>
                          {item.note && <p className="text-xs text-white/55">{item.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => void saveProject()} disabled={isPending} className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-60">{isPending ? "저장 후 새로고침 중..." : "프로젝트 저장"}</button>
                {saveMessage && <p className="text-xs text-white/60">{saveMessage}</p>}
              </div>
            </Panel>
            <Panel title="Spec checklist">
              <div className="space-y-3">
                {(selectedProject.checklist || []).map((item) => <ChecklistRow key={item.id} item={item} />)}
                {!selectedProject.checklist?.length && <EmptyLine message="아직 checklist가 정의되지 않았습니다." />}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Sector progress">
              <div className="space-y-3">
                {(selectedProject.sectors || []).map((sector) => <SectorRow key={sector.id} sector={sector} />)}
                {!selectedProject.sectors?.length && <EmptyLine message="아직 sector progress가 정의되지 않았습니다." />}
              </div>
            </Panel>
            <Panel title="Operating cadence">
              <div className="space-y-3">
                {(selectedProject.operatingCadence || []).map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{item}</div>
                ))}
                {!selectedProject.operatingCadence?.length && <EmptyLine message="운영 cadence가 아직 정의되지 않았습니다." />}
              </div>
            </Panel>
            <Panel title="Admin surfaces">
              <div className="space-y-3">
                {(selectedProject.adminSurfaces || []).map((surface) => (
                  <a key={surface.id} href={surface.href || "#"} target={surface.href ? "_blank" : undefined} rel={surface.href ? "noreferrer" : undefined} className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-sm transition hover:bg-white/10">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong>{surface.label}</strong>
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", surface.status === "todo" ? "bg-slate-100 text-slate-700" : surface.status === "doing" ? "bg-amber-100 text-amber-700" : surface.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{surface.status === "todo" ? "대기" : surface.status === "doing" ? "진행 중" : surface.status === "done" ? "완료" : "막힘"}</span>
                    </div>
                    <p className="text-white/70">{surface.summary}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">{surface.kind}</p>
                  </a>
                ))}
                {!selectedProject.adminSurfaces?.length && <EmptyLine message="연결된 운영 surface가 없습니다." />}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <Panel title="Connected tasks">
              <div className="space-y-4">
                {projectTasks.map((task) => (
                  <TaskRow key={task.id} task={task} projectName={selectedProject.name} notesById={notesById} compact repo={selectedRepo} />
                ))}
                {!projectTasks.length && <EmptyLine message="연결된 task가 없습니다." />}
              </div>
            </Panel>
            <Panel title="GitHub repo / project layer">
              <div className="space-y-4">
                {selectedRepo ? <GitHubRepoDetail repo={selectedRepo} /> : <EmptyLine message="이 프로젝트는 repo가 연결되지 않았습니다." />}
                {projectRepoHealth && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoTile label="Health score" value={`${projectRepoHealth.score}/100`} />
                    <InfoTile label="Branch alignment" value={projectRepoHealth.branchAligned ? "tracked branch aligned" : "project branch != repo default"} />
                    <InfoTile label="Issue pressure" value={String(projectRepoHealth.issuePressure)} />
                    <InfoTile label="Days since push" value={projectRepoHealth.daysSincePush != null ? String(projectRepoHealth.daysSincePush) : "-"} />
                  </div>
                )}
                {!!selectedProject.githubFocus?.length && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                    <p className="mb-3 text-sm font-semibold text-white/55">GitHub focus</p>
                    <ul className="list-disc space-y-2 pl-4">
                      {selectedProject.githubFocus.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {selectedProjectBoards.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white/55">Project boards</p>
                    {selectedProjectBoards.slice(0, 4).map((board) => (
                      <ProjectBoardCard key={board.id} board={board} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50/90">
                    <p className="font-semibold">GitHub Project board real data unavailable</p>
                    <p className="mt-2 text-xs leading-6 text-amber-100/85">
                      {boardScopeWarning
                        ? "현재 GitHub token에 `read:project` scope가 없어 board API 응답이 차단됩니다. repo/release 데이터는 계속 실데이터로 읽고 있고, board는 권한 확보 전까지 explicit blocked 상태로 남깁니다."
                        : selectedRepo
                          ? "조회 가능한 GitHub Project board가 없거나 해당 owner에 board가 없습니다."
                          : "repo 연결 후 project board를 표시합니다."}
                    </p>
                  </div>
                )}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white/55">Release signal</p>
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", selectedProjectReleases.length ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>{selectedProjectReleases.length ? `${selectedProjectReleases.length} GitHub releases` : "no GitHub releases"}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoTile label="Default / tracked branch" value={`${selectedRepo?.defaultBranch || "-"} / ${selectedProject.branch || "-"}`} />
                    <InfoTile label="Latest push" value={selectedRepo?.pushedAt || "미기록"} />
                    <InfoTile label="Deploy URL" value={selectedProject.deployUrl || "-"} />
                    <InfoTile label="Real-data mode" value={`${data.github.mode} cache @ ${data.github.generatedAt}`} />
                  </div>
                  {selectedProjectReleases.length > 0 ? (
                    selectedProjectReleases.map((release) => (
                      <ReleaseCard key={release.id} release={release} compact />
                    ))
                  ) : (
                    <p className="text-xs text-white/55">릴리즈가 없더라도 마지막 push, branch alignment, deploy target, verifying task를 함께 보여줘서 배포 판단에 필요한 실제 운영 신호는 유지합니다.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-3 text-sm font-semibold text-white/55">Linked vault notes</p>
                  <p className="mb-3 text-xs text-white/45">{selectedProjectNotes.length}개 note · source {data.dataSource.mode} · vault mapped {data.vault.projectMappedCount}</p>
                  <div className="space-y-3">
                    {selectedProjectNotes.slice(0, 5).map((note) => {
                      const linkStats = vaultLinksByNoteId.get(note.id);
                      return (
                        <button key={note.id} onClick={() => {
                          setSelectedNoteId(note.id);
                          setSection("notes");
                        }} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                          <div className="flex items-center justify-between gap-3">
                            <strong>{note.title}</strong>
                            <span className="text-xs text-white/45">↗ {linkStats?.linkedBy.length || 0} · → {linkStats?.linksTo.length || 0}</span>
                          </div>
                          <p className="mt-2 text-sm text-white/70">{note.summary}</p>
                        </button>
                      );
                    })}
                    {!selectedProjectNotes.length && <EmptyLine message="아직 project와 연결된 vault note가 부족합니다." />}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
