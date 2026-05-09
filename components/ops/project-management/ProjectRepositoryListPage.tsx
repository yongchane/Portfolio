import Link from "next/link";
import clsx from "clsx";
import { Panel } from "@/components/ops/shared";
import type { OpsConsoleData } from "@/lib/ops/types";
import { getManagedRepos, getRepoStatus, toProjectId } from "@/components/ops/project-management/mock-data";

function tone(status: string) {
  if (status === "healthy") return "bg-emerald-100 text-emerald-700";
  if (status === "warning") return "bg-amber-100 text-amber-700";
  if (status === "risk") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export function ProjectRepositoryListPage({ data }: { data: OpsConsoleData }) {
  const managedRepos = getManagedRepos(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.24em] text-white/45">Managed repositories</p>
          <h1 className="text-4xl font-black">프로젝트 관리</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
            운영 콘솔에 추가한 GitHub 레포지토리 목록입니다. 레포를 클릭하면 설계 canvas 화면으로 이동합니다.
          </p>
        </div>
        <Link href="/ops/projects/new" className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-cyan-100">
          + GitHub에서 프로젝트 추가
        </Link>
      </div>

      <Panel title="Repository list">
        <div className="divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          {managedRepos.map(({ repo, deployUrl }) => {
            const status = getRepoStatus(repo, deployUrl);
            return (
              <Link key={repo.repo} href={`/ops/projects/${toProjectId(repo)}`} className="block p-5 transition hover:bg-white/10">
                <div className="grid gap-5 xl:grid-cols-[1fr_520px] xl:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <strong className="text-xl text-white">{repo.name}</strong>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">{repo.visibility}</span>
                      {repo.primaryLanguage && <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">{repo.primaryLanguage}</span>}
                    </div>
                    <p className="text-sm text-white/55">{repo.repo}</p>
                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-white/70">{repo.description || "설명 없음"}</p>
                  </div>
                  <div className="grid gap-2 text-xs md:grid-cols-2">
                    <span className="rounded-full bg-white/10 px-3 py-2 text-white/70">최종 수정 {status.updatedAt}</span>
                    <span className={clsx("rounded-full px-3 py-2 font-semibold", tone(status.deployStatus))}>배포 {status.deployStatus}</span>
                    <span className={clsx("rounded-full px-3 py-2 font-semibold", tone(status.securityStatus))}>보안 {status.securityStatus}</span>
                    <span className="rounded-full bg-white/10 px-3 py-2 text-white/70">PR {repo.openPullRequestsCount ?? 0} · Issue {repo.openIssuesCount ?? 0}</span>
                    <span className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 font-semibold text-emerald-50 md:col-span-2">
                      배포 주소 {deployUrl || "아직 연결된 배포 URL 없음"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
