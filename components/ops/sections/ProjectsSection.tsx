import clsx from "clsx";
import { EmptyLine, GitHubRepoDetail, InfoTile, Panel, ProjectBoardCard, ReleaseCard, TaskRow, SectorRow, ChecklistRow, projectStageMeta } from "@/components/ops/shared";
import type { ProjectsSectionProps } from "@/components/ops/sections/types";

export function ProjectsSection({ data, notesById, setSection, setSelectedProjectId, setSelectedNoteId, selectedProject, projectTasks, selectedRepo, selectedProjectBoards, selectedProjectReleases, selectedProjectNotes, projectRepoHealth, vaultLinksByNoteId }: ProjectsSectionProps) {
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
            <Panel title="Sector progress">
              <div className="space-y-3">
                {(selectedProject.sectors || []).map((sector) => <SectorRow key={sector.id} sector={sector} />)}
                {!selectedProject.sectors?.length && <EmptyLine message="아직 sector progress가 정의되지 않았습니다." />}
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
            <Panel title="Vault views">
              <div className="space-y-3">
                {(selectedProject.vaultViews || []).map((view) => (
                  <div key={view} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{view}</div>
                ))}
                {!selectedProject.vaultViews?.length && <EmptyLine message="추천 vault view가 아직 없습니다." />}
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
                  <EmptyLine message={selectedRepo ? "조회 가능한 GitHub Project board가 없거나 권한 범위 밖입니다." : "repo 연결 후 project board를 표시합니다."} />
                )}
                {selectedProjectReleases.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white/55">Recent releases</p>
                    {selectedProjectReleases.map((release) => (
                      <ReleaseCard key={release.id} release={release} compact />
                    ))}
                  </div>
                )}
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
