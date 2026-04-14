import clsx from "clsx";
import {
  EmptyLine,
  GitHubRepoCard,
  noteTypeMeta,
  Panel,
  ReleaseCard,
  SummaryCard,
  TaskRow,
} from "@/components/ops/shared";
import type { OverviewSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

export function OverviewSection({
  data,
  summary,
  notesById,
  githubReposByName,
  setSection,
  setSelectedProjectId,
  setSelectedNoteId,
  attentionTasks,
  liveStatus,
}: OverviewSectionProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">
          Overview
        </p>
        <h2 className="mb-3 text-4xl font-bold">오늘의 운영 상황</h2>
        <p className="max-w-3xl text-white/70">
          애옹 작업, 프로젝트 상태, notes snapshot, GitHub layer, 사용자 판단
          필요 항목, 그리고 지금 화면이 실제로 어떤 source of truth를 읽고
          있는지 한 번에 보는 홈 화면입니다.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <SummaryCard
          label="전체 프로젝트"
          value={String(summary.totalProjects)}
        />
        <SummaryCard label="진행 중 작업" value={String(summary.activeTasks)} />
        <SummaryCard
          label="검증 중 작업"
          value={String(summary.verifyingTasks)}
        />
        <SummaryCard label="저장된 노트" value={String(summary.notesCount)} />
        <SummaryCard
          label="AI worklogs"
          value={String(summary.worklogsCount)}
        />
        <SummaryCard
          label="Typed artifacts"
          value={String(summary.artifactCount)}
        />
        <SummaryCard label="Decisions" value={String(summary.decisionCount)} />
        <SummaryCard label="Learnings" value={String(summary.learningCount)} />
        <SummaryCard
          label="Project-linked notes"
          value={String(summary.mappedNotes)}
        />
        <SummaryCard label="Vault orphan" value={String(summary.orphanNotes)} />
        <SummaryCard label="GitHub repos" value={String(summary.githubRepos)} />
        <SummaryCard
          label="GitHub boards"
          value={String(summary.githubBoards)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="사용자 판단 필요">
          <div className="space-y-4">
            {attentionTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectName={
                  data.projects.find((p) => p.id === task.projectId)?.name ||
                  "-"
                }
                notesById={notesById}
                compact
              />
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
                  <span
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      noteTypeMeta[note.type].tone,
                    )}
                  >
                    {noteTypeMeta[note.type].label}
                  </span>
                </div>
                <p className="mb-2 text-sm text-white/70">{note.summary}</p>
                <p className="text-xs text-white/45">{note.path}</p>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Recent AI work">
          <div className="space-y-3">
            {data.worklogs.slice(0, 4).map((worklog) => (
              <div
                key={worklog.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-white">{worklog.title}</strong>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {worklog.actor} · {worklog.status}
                  </span>
                </div>
                <p className="mt-2 text-white/70">{worklog.summary}</p>
                <p className="mt-2 text-xs text-white/45">
                  {worklog.project || worklog.repo || "unassigned"} ·{" "}
                  {worklog.sourceMachine || "source unknown"} ·{" "}
                  {formatDateTime(worklog.updatedAt)}
                </p>
              </div>
            ))}
            {!data.worklogs.length && (
              <EmptyLine message="아직 감지된 AI worklog가 없습니다. markdown sync 또는 `/api/ops/ingest` direct ingest가 들어오면 여기에 바로 나타납니다." />
            )}
          </div>
        </Panel>
        <Panel title="Recent typed artifacts">
          <div className="space-y-3">
            {data.artifacts.slice(0, 6).map((artifact) => (
              <div
                key={artifact.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-white">{artifact.title}</strong>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    {artifact.artifactType}
                  </span>
                </div>
                <p className="mt-2 text-white/70">{artifact.summary}</p>
                <p className="mt-2 text-xs text-white/45">
                  {artifact.project || artifact.repo || "unassigned"} ·{" "}
                  {artifact.actor || "unknown actor"} ·{" "}
                  {formatDateTime(artifact.updatedAt)}
                </p>
              </div>
            ))}
            {!data.artifacts.length && (
              <EmptyLine message="아직 typed artifact가 없습니다. worklog / decision / learning 신호가 노트에 쌓이면 여기에 나타납니다." />
            )}
          </div>
        </Panel>
        <Panel title="Data source verification">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                Active read source
              </p>
              <p className="text-lg font-semibold text-white">
                {liveStatus?.mode || data.dataSource.mode}
              </p>
              <p className="mt-2 text-xs text-white/55">
                preferred {data.dataSource.sourceHealth.preferredMode} · notes{" "}
                {liveStatus?.notesCount ?? data.dataSource.notesCount} ·
                worklogs {liveStatus?.worklogsCount ?? data.worklogs.length} ·
                projects {liveStatus?.projectsCount ?? data.projects.length} ·
                tasks {liveStatus?.tasksCount ?? data.tasks.length}
              </p>
              <p className="mt-2 text-xs text-white/50">
                updated{" "}
                {formatDateTime(
                  liveStatus?.generatedAt || data.dataSource.generatedAt,
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                Write behavior
              </p>
              <p className="text-lg font-semibold text-white">
                {data.dataSource.mode === "supabase"
                  ? "Supabase first + local mirror"
                  : "local fallback first"}
              </p>
              <p className="mt-2 text-xs text-white/55">
                Supabase read mode에서는 write도 DB-first로 맞추고 local
                JSON/notes mirror를 함께 남깁니다. 로컬 모드에서는 기존
                fallback-first를 유지합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75 md:col-span-2">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                Supabase + automation health
              </p>
              <p className="text-lg font-semibold text-white">
                {data.dataSource.sourceHealth.supabaseConfigured
                  ? data.dataSource.sourceHealth.supabaseReachable
                    ? "configured + reachable"
                    : "configured but unreachable"
                  : "not configured"}
              </p>
              <p className="mt-2 text-xs text-white/55">
                last sync {data.dataSource.sourceHealth.lastSyncStatus || "-"} ·{" "}
                {formatDateTime(data.dataSource.sourceHealth.lastSyncAt)}
              </p>
              <p className="mt-2 text-xs text-white/55">
                automation{" "}
                {liveStatus?.sourceHealth.automation?.mode ||
                  data.dataSource.sourceHealth.automation?.mode ||
                  "manual"}{" "}
                ·{" "}
                {liveStatus?.sourceHealth.automation?.state ||
                  data.dataSource.sourceHealth.automation?.state ||
                  "manual"}{" "}
                · heartbeat{" "}
                {formatDateTime(
                  liveStatus?.sourceHealth.automation?.heartbeatAt ||
                    data.dataSource.sourceHealth.automation?.heartbeatAt,
                )}
              </p>
              <p className="mt-2 text-xs text-white/55">
                worklogs{" "}
                {data.dataSource.sourceHealth.worklogsCount ??
                  data.worklogs.length}{" "}
                · artifacts{" "}
                {data.dataSource.sourceHealth.artifactsCount ??
                  data.artifacts.length}{" "}
                · latest{" "}
                {formatDateTime(
                  data.dataSource.sourceHealth.artifactsUpdatedAt ||
                    data.dataSource.sourceHealth.worklogsUpdatedAt ||
                    data.artifacts[0]?.updatedAt ||
                    data.worklogs[0]?.updatedAt,
                )}
              </p>
              {(liveStatus?.sourceHealth.automation?.lastRunMessage ||
                data.dataSource.sourceHealth.automation?.lastRunMessage) && (
                <p className="mt-2 text-xs text-white/50">
                  {liveStatus?.sourceHealth.automation?.lastRunMessage ||
                    data.dataSource.sourceHealth.automation?.lastRunMessage}
                </p>
              )}
              {data.dataSource.sourceHealth.lastSyncMessage && (
                <p className="mt-2 text-xs text-white/50">
                  {data.dataSource.sourceHealth.lastSyncMessage}
                </p>
              )}
            </div>
          </div>
        </Panel>
        <Panel title="Vault operating signals">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                Hot folders
              </p>
              <div className="space-y-2">
                {data.vault.folders.slice(0, 4).map((folder) => (
                  <div
                    key={folder.folder}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2"
                  >
                    <span className="truncate">{folder.folder}</span>
                    <span className="text-xs text-white/45">
                      {folder.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                Tag clusters
              </p>
              <div className="flex flex-wrap gap-2">
                {data.vault.tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag.tag}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
                  >
                    #{tag.tag} · {tag.count}
                  </span>
                ))}
                {!data.vault.tags.length && (
                  <EmptyLine message="아직 집계된 태그가 없습니다." />
                )}
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="GitHub 연결 현황">
          <div className="grid gap-4 md:grid-cols-2">
            {data.projects
              .filter((project) => project.repo)
              .map((project) => (
                <GitHubRepoCard
                  key={project.id}
                  project={project}
                  repo={
                    project.repo
                      ? githubReposByName.get(project.repo)
                      : undefined
                  }
                  onOpen={() => {
                    setSelectedProjectId(project.id);
                    setSection("projects");
                  }}
                />
              ))}
          </div>
        </Panel>
        <Panel title="최근 GitHub 릴리즈">
          <div className="space-y-3">
            {data.github.releases.slice(0, 5).map((release) => (
              <ReleaseCard key={release.id} release={release} compact />
            ))}
            {!data.github.releases.length && (
              <EmptyLine message="릴리즈 데이터가 아직 없습니다. sync 후 이곳에 최신 release가 표시됩니다." />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
