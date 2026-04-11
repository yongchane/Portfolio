import clsx from "clsx";
import { ChecklistRow, EmptyState, InfoTile, Panel, ReleaseCard, SummaryCard } from "@/components/ops/shared";
import type { ReleasesSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

export function ReleasesSection({ data, summary, releaseProjects }: ReleasesSectionProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Releases</p>
        <h2 className="mb-3 text-4xl font-bold">릴리즈 관제</h2>
        <p className="max-w-3xl text-white/70">프로젝트별 deploy 상태와 GitHub release 흔적을 함께 봅니다. 아직 write 동작은 없고 read-only 운영 관제용이지만, 이제 repo별 freshness / 브랜치 정렬 / release 부재까지 바로 읽을 수 있습니다.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Tracked repos" value={String(releaseProjects.length)} />
        <SummaryCard label="GitHub releases" value={String(data.github.releases.length)} />
        <SummaryCard label="Verifying tasks" value={String(summary.verifyingTasks)} />
        <SummaryCard label="Branch mismatches" value={String(releaseProjects.filter((item) => !item.branchAligned).length)} />
        <SummaryCard label="No-release repos" value={String(releaseProjects.filter((item) => !item.releases.length).length)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Release checklist">
          <div className="space-y-3">
            <ChecklistRow item={{ id: "release-1", label: "현재 작업 브랜치와 보호 브랜치 규칙 확인", status: releaseProjects.some((item) => !item.branchAligned) ? "doing" : "done", note: "Portfolio는 develop만 사용, main touch 금지" }} />
            <ChecklistRow item={{ id: "release-2", label: "비로그인 public page smoke test", status: "todo", note: "build 후 route별 확인 필요" }} />
            <ChecklistRow item={{ id: "release-3", label: "GitHub release / deploy 흔적 동기화", status: data.github.releases.length ? "done" : "doing", note: data.github.releases.length ? "최근 release cache 반영됨" : "release가 없거나 아직 sync 전" }} />
            <ChecklistRow item={{ id: "release-4", label: "검증 대기 task 표시", status: summary.verifyingTasks ? "doing" : "todo", note: `${summary.verifyingTasks}개 task가 verifying 상태` }} />
            <ChecklistRow item={{ id: "release-5", label: "Source health 확인", status: data.dataSource.sourceHealth.supabaseConfigured ? (data.dataSource.sourceHealth.supabaseReachable ? "done" : "blocked") : "doing", note: `${data.dataSource.sourceHealth.activeMode} / preferred ${data.dataSource.sourceHealth.preferredMode}` }} />
          </div>
        </Panel>
        <Panel title="Repo readiness snapshot">
          <div className="space-y-3">
            {releaseProjects.map(({ project, repo, releases, latestRelease, daysSincePush, branchAligned }) => (
              <div key={project.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">{project.name}</p>
                    <strong>{project.repo}</strong>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", branchAligned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{branchAligned ? "branch aligned" : "branch mismatch"}</span>
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", releases.length ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700")}>{releases.length ? `${releases.length} releases` : "no releases"}</span>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile label="Latest push" value={formatDateTime(repo?.pushedAt)} />
                  <InfoTile label="Days since push" value={daysSincePush != null ? String(daysSincePush) : "-"} />
                  <InfoTile label="Default / tracked" value={`${repo?.defaultBranch || "-"} / ${project.branch || "-"}`} />
                  <InfoTile label="Latest release" value={latestRelease ? `${latestRelease.tagName} · ${formatDateTime(latestRelease.publishedAt)}` : "없음"} />
                </div>
                {project.deployUrl && <p className="mt-3 text-xs text-white/45">deploy {project.deployUrl}</p>}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent releases from GitHub">
        <div className="space-y-3">
          {data.github.releases.map((release) => (
            <ReleaseCard key={`${release.repo}-${release.id}`} release={release} />
          ))}
          {!data.github.releases.length && <EmptyState title="GitHub release 없음" description="repo에 release가 없거나, 아직 GitHub sync를 실행하지 않았습니다." />}
        </div>
      </Panel>
    </div>
  );
}
