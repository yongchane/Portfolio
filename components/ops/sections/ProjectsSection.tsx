"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  EmptyLine,
  GitHubRepoDetail,
  InfoTile,
  Panel,
  ProjectBoardCard,
  ReleaseCard,
  TaskRow,
  SectorRow,
  ChecklistRow,
} from "@/components/ops/shared";
import type { ProjectsSectionProps } from "@/components/ops/sections/types";
import { buildOpsProjectModel } from "@/lib/ops/projects";
import type {
  GitHubProjectBoardSnapshot,
  OpsProjectActionItem,
  OpsProjectAiReviewColumn,
  OpsProjectCommand,
  OpsProjectRailItem,
  ProgressState,
  Project,
  ProjectStage,
} from "@/lib/ops/types";

const aiReviewSeverityTone = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-sky-100 text-sky-700",
  info: "bg-white/10 text-white/70",
  none: "bg-white/10 text-white/50",
} as const;

const missionStatusTone = {
  risk: "border-rose-300/40 bg-rose-400/10 text-rose-50 shadow-rose-950/20",
  attention: "border-amber-300/40 bg-amber-400/10 text-amber-50 shadow-amber-950/20",
  healthy: "border-emerald-300/35 bg-emerald-400/10 text-emerald-50 shadow-emerald-950/20",
} as const;

const projectActionTone = {
  critical: "border-rose-300/40 bg-rose-400/10 text-rose-50",
  warning: "border-amber-300/40 bg-amber-400/10 text-amber-50",
  info: "border-cyan-300/25 bg-cyan-400/[0.07] text-cyan-50",
} as const;

function extractProjectBoardScopeWarning(
  warnings: string[] | undefined,
  owner?: string,
) {
  return warnings?.find(
    (warning) =>
      warning.includes("read:project") &&
      (!owner || warning.includes(`projects(${owner})`)),
  );
}

function MissionPill({ label, tone }: { label: string; tone: string }) {
  return <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", tone)}>{label}</span>;
}

function ProjectSelectorCard({ item, selected, onSelect }: { item: OpsProjectRailItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full rounded-3xl border p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:bg-white/10",
        selected ? missionStatusTone[item.status] : "border-white/10 bg-white/5",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <strong className="text-lg text-white">{item.name}</strong>
          <p className="mt-1 text-xs text-white/45">{item.repo || "repo 미연결"}</p>
        </div>
        <MissionPill label={item.status} tone={missionStatusTone[item.status]} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full bg-white/10 px-2 py-1">score {item.score}</span>
        <span className="rounded-full bg-white/10 px-2 py-1">blocked {item.counts.blockedTasks}</span>
        <span className="rounded-full bg-white/10 px-2 py-1">verify {item.counts.verifyingTasks}</span>
        <span className="rounded-full bg-white/10 px-2 py-1">review {item.counts.openReviews}</span>
        <span className="rounded-full bg-white/10 px-2 py-1">docs {item.counts.linkedNotes}</span>
      </div>
    </button>
  );
}

function ProjectCommandHeader({ command, project }: { command: OpsProjectCommand; project: Project }) {
  return (
    <header className={clsx("rounded-[2rem] border p-6 shadow-2xl", missionStatusTone[command.status])}>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <MissionPill label="Project Mission Control" tone="border-white/15 bg-black/20 text-white/75" />
            <MissionPill label={command.status} tone={missionStatusTone[command.status]} />
            <MissionPill label={`Health ${command.score}`} tone="border-white/15 bg-black/20 text-white/80" />
          </div>
          <h3 className="text-3xl font-black text-white md:text-4xl">{command.title}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">{command.summary}</p>
        </div>
        {command.primaryAction && (
          <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Primary action</p>
            <p className="mt-2 font-bold text-white">{command.primaryAction.label}</p>
          </div>
        )}
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
        <InfoTile label="Project" value={project.name} />
        <InfoTile label="Stage" value={project.stage} />
        <InfoTile label="Repo" value={project.repo || "-"} />
        <InfoTile label="Tasks" value={String(command.stats.tasks)} />
        <InfoTile label="Open reviews" value={String(command.stats.openReviews)} />
        <InfoTile label="Missing reviews" value={String(command.stats.missingReviewCategories)} />
      </div>
    </header>
  );
}

function ProjectActionQueue({ actions }: { actions: OpsProjectActionItem[] }) {
  return (
    <Panel title="Project Action Queue">
      {actions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {actions.map((action) => (
            <article key={action.id} className={clsx("rounded-2xl border p-4", projectActionTone[action.severity])}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <MissionPill label={action.category} tone="border-white/15 bg-black/20 text-white/75" />
                <span className="text-xs text-white/45">{action.source.table}</span>
              </div>
              <h4 className="font-bold text-white">{action.title}</h4>
              <p className="mt-2 text-sm leading-6 text-white/70">{action.reason}</p>
              <p className="mt-3 text-sm font-semibold text-white">{action.cta} →</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyLine message="지금 즉시 처리할 프로젝트 액션이 없습니다." />
      )}
    </Panel>
  );
}

function AiReviewBoardV2({ columns }: { columns: OpsProjectAiReviewColumn[] }) {
  return (
    <Panel title="AI Review Board v2">
      <div className="mb-4 rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-50/90">
        <p className="font-semibold">레포별 AI 평가/코멘트 보드</p>
        <p className="mt-1 text-xs text-violet-100/80">
          QA, 보안, 기능, 업데이트, UI/UX 관점의 open review를 운영 액션 후보로 다룹니다. 실제 실행은 Agent Run queue와 Mac mini worker 연결을 따릅니다.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {columns.map((column) => (
          <div key={column.category} className={clsx("rounded-2xl border p-4", column.status === "risk" ? projectActionTone.warning : column.status === "covered" ? missionStatusTone.healthy : "border-white/10 bg-black/20 text-white/70")}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{column.label}</p>
                <p className="mt-1 text-xs text-white/45">{column.helper}</p>
              </div>
              <MissionPill label={column.status} tone={column.status === "risk" ? projectActionTone.warning : column.status === "covered" ? missionStatusTone.healthy : "border-white/15 bg-white/5 text-white/55"} />
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded-full bg-white/10 px-2 py-1">open {column.counts.open}</span>
              <span className="rounded-full bg-white/10 px-2 py-1">resolved {column.counts.resolved}</span>
              <span className={clsx("rounded-full px-2 py-1 font-semibold", aiReviewSeverityTone[column.highestSeverity])}>{column.highestSeverity}</span>
            </div>
            <div className="space-y-3">
              {column.reviews.slice(0, 3).map((review) => (
                <article key={review.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <strong className="text-white">{review.title}</strong>
                    <span className={clsx("rounded-full px-2 py-0.5 font-semibold", aiReviewSeverityTone[review.severity])}>{review.severity}</span>
                  </div>
                  <p className="line-clamp-3">{review.comment}</p>
                  {review.recommendation && <p className="mt-2 font-semibold text-white/75">→ {review.recommendation}</p>}
                  <p className="mt-2 uppercase tracking-[0.16em] text-white/30">{review.status}</p>
                </article>
              ))}
              {!column.reviews.length && (
                <p className="rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-xs text-white/40">{column.emptyMessage}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ProjectDataTrustCard({ model }: { model: ReturnType<typeof buildOpsProjectModel> }) {
  return (
    <Panel title="Project Data Trust">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <InfoTile label="Source" value={model.dataTrust.activeSource} />
        <InfoTile label="Generated" value={model.dataTrust.generatedAt} />
        <InfoTile label="Tasks" value={String(model.dataTrust.counts.tasks)} />
        <InfoTile label="AI reviews" value={String(model.dataTrust.counts.aiReviews)} />
        <InfoTile label="Linked docs" value={String(model.dataTrust.counts.linkedNotes)} />
        <InfoTile label="Workflow runs" value={String(model.dataTrust.counts.workflowRuns)} />
      </div>
      {!!model.dataTrust.warnings.length && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
          {model.dataTrust.warnings.map((warning) => (
            <p key={warning}>• {warning}</p>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function ProjectsSection({
  data,
  notesById,
  githubReposByName,
  setSection,
  setSelectedProjectId,
  setSelectedNoteId,
  selectedProject,
  projectTasks,
  selectedRepo,
  selectedProjectBoards,
  selectedProjectReleases,
  selectedProjectNotes,
  selectedProjectNotesCount,
  selectedProjectNextActions,
  projectExecutionStatus,
  projectRepoHealth,
  vaultLinksByNoteId,
}: ProjectsSectionProps) {
  const router = useRouter();
  const [summaryDraft, setSummaryDraft] = useState(selectedProject.summary);
  const [stageDraft, setStageDraft] = useState<ProjectStage>(
    selectedProject.stage,
  );
  const [checklistDraft, setChecklistDraft] = useState<
    Record<string, ProgressState>
  >({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const checklistPayload = useMemo(
    () =>
      (selectedProject.checklist || []).map((item) => ({
        id: item.id,
        status: checklistDraft[item.id] || item.status,
      })),
    [selectedProject.checklist, checklistDraft],
  );

  const boardScopeWarning = extractProjectBoardScopeWarning(
    data.github.warnings,
    selectedRepo?.owner,
  );
  const selectedWorkflowRuns = (data.github.workflowRuns || []).filter(
    (run) => run.repo === selectedRepo?.repo,
  );
  const selectedSecurityAlerts = (data.github.securityAlerts || []).filter(
    (alert) => alert.repo === selectedRepo?.repo,
  );
  const latestWorkflowRun = selectedWorkflowRuns[0];
  const failedWorkflowRuns = selectedWorkflowRuns.filter(
    (run) => run.conclusion === "failure" || run.conclusion === "cancelled",
  );
  const projectBoardsByOwner = useMemo(() => {
    const map = new Map<string, GitHubProjectBoardSnapshot[]>();
    for (const board of data.github.projectBoards) {
      map.set(board.owner, [...(map.get(board.owner) || []), board]);
    }
    return map;
  }, [data.github.projectBoards]);
  const projectModel = useMemo(
    () =>
      buildOpsProjectModel({
        data,
        selectedProject,
        githubReposByName,
        projectBoardsByOwner,
      }),
    [data, selectedProject, githubReposByName, projectBoardsByOwner],
  );

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

    setSaveMessage(
      data.dataSource.mode === "supabase"
        ? "Supabase project row를 먼저 맞추고 local projects fallback도 함께 갱신한 뒤 화면을 새로고침합니다."
        : "로컬 fallback source에 반영했고 화면을 새로고침합니다.",
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">
          Projects
        </p>
        <h2 className="mb-3 text-4xl font-bold">프로젝트 운영 관리</h2>
        <p className="max-w-3xl text-white/70">
          기획 → 개발 → 배포 → 운영 흐름을 프로젝트 단위로 봅니다. stage,
          checklist, GitHub 상태뿐 아니라 이 프로젝트가 지금 어느 저장 경로를
          믿고 있는지도 같이 보여줍니다.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          {projectModel.rail.map((item) => (
            <ProjectSelectorCard
              key={item.projectId}
              item={item}
              selected={selectedProject.id === item.projectId}
              onSelect={() => setSelectedProjectId(item.projectId)}
            />
          ))}
        </div>
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <ProjectCommandHeader command={projectModel.command} project={selectedProject} />
          <ProjectActionQueue actions={projectModel.actions} />

          <div className="grid gap-4 text-sm text-white/75 md:grid-cols-2 xl:grid-cols-8">
            <InfoTile label="Repository" value={selectedProject.repo || "-"} />
            <InfoTile label="Branch" value={selectedProject.branch || "-"} />
            <InfoTile label="Deploy" value={selectedProject.deployUrl || "-"} />
            <InfoTile
              label="Docs"
              value={selectedProject.docs?.join(", ") || "-"}
            />
            <InfoTile
              label="Linked notes"
              value={String(selectedProjectNotesCount)}
            />
            <InfoTile
              label="Connected tasks"
              value={String(projectTasks.length)}
            />
            <InfoTile
              label="Boards / releases"
              value={`${selectedProjectBoards.length} / ${selectedProjectReleases.length}`}
            />
            <InfoTile
              label="Repo health"
              value={projectRepoHealth ? `${projectRepoHealth.score}/100` : "-"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Project save behavior">
              <div className="space-y-4 text-sm text-white/80">
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-xs leading-6 text-emerald-50/90">
                  <p className="font-semibold">현재 저장 경로</p>
                  <p className="mt-2">
                    Supabase 읽기 모드에서는 <code>ops_projects</code>를 먼저
                    갱신하고 <code>data/ops/projects.json</code> fallback도 같이
                    맞춥니다.
                  </p>
                  <p className="mt-1">
                    로컬 모드에서는 기존처럼 JSON fallback만 갱신합니다. 그래서
                    카드/세부화면이 서로 다른 source를 가리키는 상황을
                    줄였습니다.
                  </p>
                  <p className="mt-2">
                    현재는 인증된 `/ops`에서만 project stage / summary /
                    checklist를 수정합니다.
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">
                    Stage
                  </span>
                  <select
                    value={stageDraft}
                    onChange={(event) =>
                      setStageDraft(event.target.value as ProjectStage)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  >
                    <option value="idea">idea</option>
                    <option value="planning">planning</option>
                    <option value="building">building</option>
                    <option value="verifying">verifying</option>
                    <option value="live">live</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">
                    Summary
                  </span>
                  <textarea
                    value={summaryDraft}
                    onChange={(event) => setSummaryDraft(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  />
                </label>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                    Checklist quick updates
                  </p>
                  <div className="space-y-3">
                    {(selectedProject.checklist || []).map((item) => {
                      const value = checklistDraft[item.id] || item.status;
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <strong>{item.label}</strong>
                            <select
                              value={value}
                              onChange={(event) =>
                                setChecklistDraft((current) => ({
                                  ...current,
                                  [item.id]: event.target
                                    .value as ProgressState,
                                }))
                              }
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                            >
                              <option value="todo">todo</option>
                              <option value="doing">doing</option>
                              <option value="done">done</option>
                              <option value="blocked">blocked</option>
                            </select>
                          </div>
                          {item.note && (
                            <p className="text-xs text-white/55">{item.note}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => void saveProject()}
                  disabled={isPending}
                  className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-60"
                >
                  {isPending ? "저장 후 새로고침 중..." : "프로젝트 저장"}
                </button>
                {saveMessage && (
                  <p className="text-xs text-white/60">{saveMessage}</p>
                )}
              </div>
            </Panel>
            <Panel title="Spec checklist">
              <div className="space-y-3">
                {(selectedProject.checklist || []).map((item) => (
                  <ChecklistRow key={item.id} item={item} />
                ))}
                {!selectedProject.checklist?.length && (
                  <EmptyLine message="아직 checklist가 정의되지 않았습니다." />
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Execution snapshot">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoTile label="Planned" value={String(projectExecutionStatus.planned)} />
                <InfoTile label="Doing" value={String(projectExecutionStatus.doing)} />
                <InfoTile label="Verifying" value={String(projectExecutionStatus.verifying)} />
                <InfoTile label="Shipped" value={String(projectExecutionStatus.shipped)} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-sm font-semibold text-white/55">Next actions snapshot</p>
                {selectedProjectNextActions.length ? (
                  <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
                    {selectedProjectNextActions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <EmptyLine message="연결된 task에 아직 next action이 없습니다." />
                )}
              </div>
            </Panel>
            <Panel title="Sector progress">
              <div className="space-y-3">
                {(selectedProject.sectors || []).map((sector) => (
                  <SectorRow key={sector.id} sector={sector} />
                ))}
                {!selectedProject.sectors?.length && (
                  <EmptyLine message="아직 sector progress가 정의되지 않았습니다." />
                )}
              </div>
            </Panel>
            <Panel title="Operating cadence">
              <div className="space-y-3">
                {(selectedProject.operatingCadence || []).map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                  >
                    {item}
                  </div>
                ))}
                {!selectedProject.operatingCadence?.length && (
                  <EmptyLine message="운영 cadence가 아직 정의되지 않았습니다." />
                )}
              </div>
            </Panel>
            <Panel title="Admin surfaces">
              <div className="space-y-3">
                {(selectedProject.adminSurfaces || []).map((surface) => (
                  <a
                    key={surface.id}
                    href={surface.href || "#"}
                    target={surface.href ? "_blank" : undefined}
                    rel={surface.href ? "noreferrer" : undefined}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-sm transition hover:bg-white/10"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <strong>{surface.label}</strong>
                      <span
                        className={clsx(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          surface.status === "todo"
                            ? "bg-slate-100 text-slate-700"
                            : surface.status === "doing"
                              ? "bg-amber-100 text-amber-700"
                              : surface.status === "done"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {surface.status === "todo"
                          ? "대기"
                          : surface.status === "doing"
                            ? "진행 중"
                            : surface.status === "done"
                              ? "완료"
                              : "막힘"}
                      </span>
                    </div>
                    <p className="text-white/70">{surface.summary}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">
                      {surface.kind}
                    </p>
                  </a>
                ))}
                {!selectedProject.adminSurfaces?.length && (
                  <EmptyLine message="연결된 운영 surface가 없습니다." />
                )}
              </div>
            </Panel>
          </div>



          <AiReviewBoardV2 columns={projectModel.aiReviewBoard} />

          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <Panel title="Connected tasks">
              <div className="space-y-4">
                {projectTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    projectName={selectedProject.name}
                    notesById={notesById}
                    compact
                    repo={selectedRepo}
                  />
                ))}
                {!projectTasks.length && (
                  <EmptyLine message="연결된 task가 없습니다." />
                )}
              </div>
            </Panel>
            <Panel title="GitHub repo / project layer">
              <div className="space-y-4">
                {selectedRepo ? (
                  <GitHubRepoDetail repo={selectedRepo} />
                ) : (
                  <EmptyLine message="이 프로젝트는 repo가 연결되지 않았습니다." />
                )}
                {projectRepoHealth && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoTile
                      label="Health score"
                      value={`${projectRepoHealth.score}/100`}
                    />
                    <InfoTile
                      label="Branch alignment"
                      value={
                        projectRepoHealth.branchAligned
                          ? "tracked branch aligned"
                          : "project branch != repo default"
                      }
                    />
                    <InfoTile
                      label="Issue pressure"
                      value={String(projectRepoHealth.issuePressure)}
                    />
                    <InfoTile
                      label="Days since push"
                      value={
                        projectRepoHealth.daysSincePush != null
                          ? String(projectRepoHealth.daysSincePush)
                          : "-"
                      }
                    />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile
                    label="Latest Actions run"
                    value={
                      latestWorkflowRun
                        ? `${latestWorkflowRun.name} · ${latestWorkflowRun.conclusion || latestWorkflowRun.status}`
                        : "no workflow run cached"
                    }
                  />
                  <InfoTile
                    label="Security alerts"
                    value={`${selectedSecurityAlerts.length} open · failed runs ${failedWorkflowRuns.length}`}
                  />
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-white/65">Security / CI feedback</p>
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        selectedSecurityAlerts.length || failedWorkflowRuns.length
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {selectedSecurityAlerts.length || failedWorkflowRuns.length
                        ? "needs review"
                        : "clean cached signal"}
                    </span>
                  </div>
                  {selectedSecurityAlerts.length ? (
                    <ul className="list-disc space-y-2 pl-4 text-xs text-white/70">
                      {selectedSecurityAlerts.slice(0, 5).map((alert) => (
                        <li key={`${alert.kind}-${alert.id}`}>
                          {alert.kind} · {alert.severity || "severity unknown"} · {alert.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/55">
                      캐시에 열린 보안 알림이 없습니다. GitHub token 권한이 부족한 경우 warnings에 blocked 사유를 남깁니다.
                    </p>
                  )}
                  {selectedWorkflowRuns.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-white/60">
                      {selectedWorkflowRuns.slice(0, 3).map((run) => (
                        <a key={run.id} href={run.url} target="_blank" rel="noreferrer" className="block hover:text-white">
                          {run.name} · {run.branch || "branch?"} · {run.conclusion || run.status} · {run.updatedAt || "updated?"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {!!selectedProject.githubFocus?.length && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                    <p className="mb-3 text-sm font-semibold text-white/55">
                      GitHub focus
                    </p>
                    <ul className="list-disc space-y-2 pl-4">
                      {selectedProject.githubFocus.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedProjectBoards.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white/55">
                      Project boards
                    </p>
                    {selectedProjectBoards.slice(0, 4).map((board) => (
                      <ProjectBoardCard key={board.id} board={board} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-50/90">
                    <p className="font-semibold">
                      GitHub Project board real data unavailable
                    </p>
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
                    <p className="text-sm font-semibold text-white/55">
                      Release signal
                    </p>
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        selectedProjectReleases.length
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {selectedProjectReleases.length
                        ? `${selectedProjectReleases.length} GitHub releases`
                        : "no GitHub releases"}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoTile
                      label="Default / tracked branch"
                      value={`${selectedRepo?.defaultBranch || "-"} / ${selectedProject.branch || "-"}`}
                    />
                    <InfoTile
                      label="Latest push"
                      value={selectedRepo?.pushedAt || "미기록"}
                    />
                    <InfoTile
                      label="Deploy URL"
                      value={selectedProject.deployUrl || "-"}
                    />
                    <InfoTile
                      label="Real-data mode"
                      value={`${data.github.mode} cache @ ${data.github.generatedAt}`}
                    />
                  </div>
                  {selectedProjectReleases.length > 0 ? (
                    selectedProjectReleases.map((release) => (
                      <ReleaseCard key={release.id} release={release} compact />
                    ))
                  ) : (
                    <p className="text-xs text-white/55">
                      릴리즈가 없더라도 마지막 push, branch alignment, deploy
                      target, verifying task를 함께 보여줘서 배포 판단에 필요한
                      실제 운영 신호는 유지합니다.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-3 text-sm font-semibold text-white/55">
                    Linked vault notes
                  </p>
                  <p className="mb-3 text-xs text-white/45">
                    {selectedProjectNotes.length}개 note · active source{" "}
                    {data.dataSource.mode} · vault mapped{" "}
                    {data.vault.projectMappedCount}
                  </p>
                  <div className="space-y-3">
                    {selectedProjectNotes.slice(0, 5).map((note) => {
                      const linkStats = vaultLinksByNoteId.get(note.id);
                      return (
                        <button
                          key={note.id}
                          onClick={() => {
                            setSelectedNoteId(note.id);
                            setSection("notes");
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <strong>{note.title}</strong>
                            <span className="text-xs text-white/45">
                              ↗ {linkStats?.linkedBy.length || 0} · →{" "}
                              {linkStats?.linksTo.length || 0}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/70">
                            {note.summary}
                          </p>
                        </button>
                      );
                    })}
                    {!selectedProjectNotes.length && (
                      <EmptyLine message="아직 project와 연결된 vault note가 부족합니다." />
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <ProjectDataTrustCard model={projectModel} />
        </div>
      </div>
    </div>
  );
}
