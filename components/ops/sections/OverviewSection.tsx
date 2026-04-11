import clsx from "clsx";
import { EmptyLine, GitHubRepoCard, noteTypeMeta, Panel, ReleaseCard, SummaryCard, TaskRow } from "@/components/ops/shared";
import type { OverviewSectionProps } from "@/components/ops/sections/types";

export function OverviewSection({ data, summary, notesById, githubReposByName, setSection, setSelectedProjectId, setSelectedNoteId, attentionTasks }: OverviewSectionProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Overview</p>
        <h2 className="mb-3 text-4xl font-bold">오늘의 운영 상황</h2>
        <p className="max-w-3xl text-white/70">애옹 작업, 프로젝트 상태, synced notes snapshot, GitHub repo/project layer, 사용자 판단 필요 항목을 한 번에 보는 홈 화면입니다.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <SummaryCard label="전체 프로젝트" value={String(summary.totalProjects)} />
        <SummaryCard label="진행 중 작업" value={String(summary.activeTasks)} />
        <SummaryCard label="검증 중 작업" value={String(summary.verifyingTasks)} />
        <SummaryCard label="저장된 노트" value={String(summary.notesCount)} />
        <SummaryCard label="Project-linked notes" value={String(summary.mappedNotes)} />
        <SummaryCard label="Vault orphan" value={String(summary.orphanNotes)} />
        <SummaryCard label="GitHub repos" value={String(summary.githubRepos)} />
        <SummaryCard label="GitHub boards" value={String(summary.githubBoards)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="사용자 판단 필요">
          <div className="space-y-4">
            {attentionTasks.map((task) => (
              <TaskRow key={task.id} task={task} projectName={data.projects.find((p) => p.id === task.projectId)?.name || "-"} notesById={notesById} compact />
            ))}
          </div>
        </Panel>
        <Panel title="최근 synced 노트">
          <div className="space-y-3">
            {data.notes.slice(0, 4).map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setSelectedNoteId(note.id);
                  setSection("notes");
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong>{note.title}</strong>
                  <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[note.type].tone)}>{noteTypeMeta[note.type].label}</span>
                </div>
                <p className="mb-2 text-sm text-white/70">{note.summary}</p>
                <p className="text-xs text-white/45">{note.path}</p>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Vault operating signals">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Hot folders</p>
              <div className="space-y-2">
                {data.vault.folders.slice(0, 4).map((folder) => (
                  <div key={folder.folder} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
                    <span className="truncate">{folder.folder}</span>
                    <span className="text-xs text-white/45">{folder.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Tag clusters</p>
              <div className="flex flex-wrap gap-2">
                {data.vault.tags.slice(0, 8).map((tag) => (
                  <span key={tag.tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">#{tag.tag} · {tag.count}</span>
                ))}
                {!data.vault.tags.length && <EmptyLine message="아직 집계된 태그가 없습니다." />}
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="GitHub 연결 현황">
          <div className="grid gap-4 md:grid-cols-2">
            {data.projects.filter((project) => project.repo).map((project) => (
              <GitHubRepoCard key={project.id} project={project} repo={project.repo ? githubReposByName.get(project.repo) : undefined} onOpen={() => {
                setSelectedProjectId(project.id);
                setSection("projects");
              }} />
            ))}
          </div>
        </Panel>
        <Panel title="최근 GitHub 릴리즈">
          <div className="space-y-3">
            {data.github.releases.slice(0, 5).map((release) => (
              <ReleaseCard key={release.id} release={release} compact />
            ))}
            {!data.github.releases.length && <EmptyLine message="릴리즈 데이터가 아직 없습니다. sync 후 이곳에 최신 release가 표시됩니다." />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
