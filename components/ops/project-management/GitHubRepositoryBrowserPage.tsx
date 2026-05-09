import Link from "next/link";
import { Panel } from "@/components/ops/shared";
import type { OpsConsoleData } from "@/lib/ops/types";
import { getAvailableGitHubRepos, toProjectId } from "@/components/ops/project-management/mock-data";

export function GitHubRepositoryBrowserPage({ data }: { data: OpsConsoleData }) {
  const repos = getAvailableGitHubRepos(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.24em] text-white/45">GitHub repositories</p>
          <h1 className="text-4xl font-black">GitHub에서 프로젝트 추가</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
            GitHub 레포 목록을 스크롤하면서 운영 콘솔에 추가할 프로젝트를 고르는 화면입니다. 지금은 목업이며 다음 단계에서 GET /api/ops/github/repositories와 POST /api/ops/projects로 연결합니다.
          </p>
        </div>
        <Link href="/ops/projects" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10">
          프로젝트 목록으로
        </Link>
      </div>

      <Panel title="내 GitHub 레포지토리">
        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-xs leading-6 text-cyan-50/90">
          <p className="font-semibold">API 연동 예정</p>
          <p className="mt-1">이 화면의 Add to Ops 버튼은 다음 단계에서 DB에 관리 프로젝트를 저장합니다. 현재는 상세 canvas로 이동하는 UI 목업입니다.</p>
        </div>
        <div className="max-h-[68vh] space-y-3 overflow-auto pr-2">
          {repos.map((repo) => (
            <article key={repo.repo} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <strong className="text-xl text-white">{repo.repo}</strong>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">{repo.visibility}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-white/70">{repo.description || "설명 없음"}</p>
                  <p className="mt-2 text-xs text-white/45">default {repo.defaultBranch} · updated {repo.updatedAt || repo.pushedAt || "미기록"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/ops/projects/${toProjectId(repo)}`} className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-cyan-100">
                    Add to Ops
                  </Link>
                  <a href={repo.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10">
                    GitHub 열기
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
