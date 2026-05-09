import clsx from "clsx";
import { EmptyLine, Panel, SummaryCard } from "@/components/ops/shared";
import type { OverviewSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";
import { buildOpsOverviewModel } from "@/lib/ops/overview";
import type {
  OpsOverviewActionItem,
  OpsOverviewHealthItem,
  OpsOverviewProjectHealth,
  OpsOverviewSeverity,
  OpsOverviewTimelineItem,
} from "@/lib/ops/types";

const severityTone: Record<OpsOverviewSeverity, string> = {
  critical: "border-rose-300/40 bg-rose-400/10 text-rose-50 shadow-rose-950/20",
  warning: "border-amber-300/40 bg-amber-400/10 text-amber-50 shadow-amber-950/20",
  info: "border-cyan-300/25 bg-cyan-400/[0.07] text-cyan-50 shadow-cyan-950/10",
  healthy: "border-emerald-300/35 bg-emerald-400/10 text-emerald-50 shadow-emerald-950/20",
  empty: "border-slate-300/25 bg-slate-400/10 text-slate-100 shadow-black/10",
};

function healthTone(status: string) {
  if (["risk", "critical", "offline", "failed", "blocked"].includes(status)) return severityTone.critical;
  if (["attention", "warning", "stale", "queued", "running", "verifying"].includes(status)) return severityTone.warning;
  if (["healthy", "online", "completed", "shipped"].includes(status)) return severityTone.healthy;
  if (["info", "monitoring"].includes(status)) return severityTone.info;
  return severityTone.empty;
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", tone)}>
      {label}
    </span>
  );
}

function ActionCard({ action, onOpen }: { action: OpsOverviewActionItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={clsx(
        "group w-full rounded-3xl border p-4 text-left shadow-xl transition hover:-translate-y-0.5 hover:bg-white/10",
        severityTone[action.severity],
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusPill label={action.category} tone="border-white/15 bg-black/20 text-white/75" />
        <span className="text-xs text-white/45">{action.source.table}</span>
      </div>
      <h4 className="text-base font-bold text-white">{action.title}</h4>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/70">{action.reason}</p>
      <p className="mt-3 text-sm font-semibold text-white transition group-hover:text-cyan-100">
        {action.cta} →
      </p>
    </button>
  );
}

function HealthTile({ item }: { item: OpsOverviewHealthItem }) {
  return (
    <div className={clsx("h-full rounded-2xl border p-4", healthTone(item.status))}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="text-white">{item.label}</strong>
        <StatusPill label={item.status} tone={healthTone(item.status)} />
      </div>
      <p className="text-sm text-white/70">{item.detail}</p>
      <p className="mt-2 text-xs text-white/45">{formatDateTime(item.lastSeenAt)}</p>
    </div>
  );
}

function ProjectHealthCard({ project, onOpen }: { project: OpsOverviewProjectHealth; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={clsx(
        "rounded-3xl border bg-black/20 p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:bg-white/10",
        healthTone(project.health),
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-white">{project.name}</h4>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">{project.stage}</p>
        </div>
        <div className="text-right">
          <StatusPill label={project.health} tone={healthTone(project.health)} />
          <p className="mt-2 text-2xl font-black text-white">Health {project.score}</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-white/75">{project.diagnosis}</p>
      <p className="mt-3 text-sm font-semibold text-white">{project.nextAction}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full bg-white/10 px-3 py-1">tasks {project.counts.tasks}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">verify {project.counts.verifyingTasks}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">docs {project.counts.notes}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">AI review {project.counts.aiReviews}</span>
        <span className="rounded-full bg-white/10 px-3 py-1">GitHub {project.signals.githubRisk}</span>
      </div>
    </button>
  );
}

function TimelineRow({ item }: { item: OpsOverviewTimelineItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-white">{item.title}</strong>
        <StatusPill label={item.status} tone={healthTone(item.status)} />
      </div>
      <p className="mt-2 line-clamp-2">{item.detail}</p>
      <p className="mt-2 text-xs text-white/45">
        {item.source} · {formatDateTime(item.occurredAt)}
      </p>
    </div>
  );
}

export function OverviewSection({
  data,
  setSection,
  setSelectedProjectId,
}: OverviewSectionProps) {
  const overview = buildOpsOverviewModel(data);
  const primaryAction = overview.command.primaryAction;

  return (
    <div className="space-y-8">
      <header className={clsx("rounded-[2rem] border p-6 shadow-2xl", healthTone(overview.command.status))}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label="오늘의 운영 커맨드" tone="border-white/15 bg-black/20 text-white/75" />
            <StatusPill label={overview.command.status} tone={healthTone(overview.command.status)} />
          </div>
          <span className="text-xs text-white/50">
            source {overview.source.mode} · updated {formatDateTime(overview.generatedAt)}
          </span>
        </div>
        <h2 className="mb-3 text-3xl font-bold md:text-4xl">{overview.command.title}</h2>
        <p className="max-w-3xl text-white/70">{overview.command.summary}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <SummaryCard label="Active" value={String(overview.command.stats.activeTasks)} />
          <SummaryCard label="Verify" value={String(overview.command.stats.verifyingTasks)} />
          <SummaryCard label="Blocked" value={String(overview.command.stats.blockedTasks)} />
          <SummaryCard label="Review gaps" value={String(overview.command.stats.reviewNeededProjects)} />
          <SummaryCard label="System alerts" value={String(overview.command.stats.staleSystems)} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {primaryAction && (
            <button
              onClick={() => setSection(primaryAction.targetSection)}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100"
            >
              {primaryAction.label}
            </button>
          )}
          <button
            onClick={() => setSection("projects")}
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            AI 리뷰 {overview.command.stats.reviewNeededProjects}건 확인
          </button>
          <button
            onClick={() => setSection("worker")}
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            시스템 주의 {overview.command.stats.staleSystems}건 보기
          </button>
        </div>
      </header>

      <Panel title="Today Action Queue / 오늘 처리할 일">
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-white/55">
          {[
            "approval",
            "verification",
            "blocked",
            "recovery",
            "review",
            "cms",
          ].map((category) => (
            <span key={category} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {category}
            </span>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.actions.map((action) => (
            <ActionCard key={action.id} action={action} onOpen={() => setSection(action.target.section)} />
          ))}
          {!overview.actions.length && <EmptyLine message="오늘 바로 처리해야 할 운영 액션이 없습니다." />}
        </div>
      </Panel>

      <Panel title="System Health Strip / 시스템 상태">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Object.values(overview.system).map((item) => (
            <button key={item.label} onClick={() => setSection(item.targetSection)} className="text-left">
              <HealthTile item={item} />
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Project Operating Radar / 프로젝트 운영 레이더">
        <div className="grid gap-4 lg:grid-cols-2">
          {overview.projects.map((project) => (
            <ProjectHealthCard
              key={project.projectId}
              project={project}
              onOpen={() => {
                setSelectedProjectId(project.projectId);
                setSection("projects");
              }}
            />
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Knowledge / CMS Snapshot / 문서 커버리지">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <SummaryCard label="Notes" value={String(overview.knowledge.coverage.totalNotes)} />
            <SummaryCard label="Linked" value={String(overview.knowledge.coverage.projectLinkedNotes)} />
            <SummaryCard label="Unlinked" value={String(overview.knowledge.coverage.orphanNotes)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {overview.knowledge.buckets.map((bucket) => (
              <span
                key={bucket.id}
                className={clsx(
                  "rounded-full border px-3 py-2 text-xs",
                  bucket.status === "healthy" ? severityTone.healthy : severityTone.empty,
                )}
              >
                {bucket.label} · {bucket.count}
              </span>
            ))}
          </div>
          {!!overview.knowledge.missing.length && (
            <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-50">
              <strong>누락된 CMS 버킷</strong>
              <ul className="mt-2 space-y-1 text-white/70">
                {overview.knowledge.missing.map((item) => (
                  <li key={item.id}>• {item.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Recent Operations Timeline / 최근 작업 흐름">
          <div className="space-y-3">
            {overview.timeline.map((item) => (
              <TimelineRow key={item.id} item={item} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Data Trust Footer / 데이터 신뢰도">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {overview.dataTrust.tables.map((table) => (
            <div
              key={table.name}
              className={clsx(
                "rounded-2xl border p-4",
                table.status === "ok"
                  ? "border-white/10 bg-white/[0.03] text-white/65"
                  : severityTone.empty,
              )}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">{table.name}</p>
              <p className="mt-2 text-2xl font-bold text-white">{table.count ?? 0}</p>
              <p className="text-xs text-white/50">{table.status}</p>
            </div>
          ))}
        </div>
        {!!overview.dataTrust.warnings.length && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
            {overview.dataTrust.warnings.map((warning) => (
              <p key={warning}>• {warning}</p>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
