"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Panel } from "@/components/ops/shared";
import type { OpsConsoleData } from "@/lib/ops/types";
import { getAvailableGitHubRepos, toProjectId, type AvailableGitHubRepo } from "@/components/ops/project-management/mock-data";

export function GitHubRepositoryBrowserPage({ data }: { data: OpsConsoleData }) {
  const router = useRouter();
  const [pendingRepo, setPendingRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoSource, setRepoSource] = useState<"initial-cache" | "live-github" | "github-cache">("initial-cache");
  const [repos, setRepos] = useState<AvailableGitHubRepo[]>(() => getAvailableGitHubRepos(data));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();

    async function loadRepositories() {
      try {
        const response = await fetch("/api/ops/projects", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; source?: "live-github" | "github-cache"; repositories?: AvailableGitHubRepo[]; warning?: string }
          | null;

        if (!response.ok || !result?.ok || !Array.isArray(result.repositories)) {
          throw new Error("GitHub repository list fetch failed");
        }

        setRepos(result.repositories);
        setRepoSource(result.source || "github-cache");
        if (result.warning) setError(result.warning);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "GitHub repository list fetch failed");
      }
    }

    void loadRepositories();
    return () => controller.abort();
  }, []);

  const addToOps = (repoName: string) => {
    setError(null);
    setPendingRepo(repoName);

    startTransition(async () => {
      try {
        const response = await fetch("/api/ops/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ repo: repoName }),
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; project?: { id?: string }; message?: string }
          | null;

        if (!response.ok || !result?.ok || !result.project?.id) {
          throw new Error(result?.message || "프로젝트 추가에 실패했습니다.");
        }

        router.push(`/ops/projects/${result.project.id}`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "프로젝트 추가에 실패했습니다.");
      } finally {
        setPendingRepo(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.24em] text-white/45">GitHub repositories</p>
          <h1 className="text-4xl font-black">GitHub에서 프로젝트 추가</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
            GitHub 레포 목록을 스크롤하면서 운영 콘솔에 추가할 프로젝트를 고르는 화면입니다. 화면 진입 시 GET /api/ops/projects로 live GitHub 목록을 불러오고, 추가 버튼은 POST /api/ops/projects로 Supabase에 관리 프로젝트를 생성합니다.
          </p>
        </div>
        <Link href="/ops/projects" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10">
          프로젝트 목록으로
        </Link>
      </div>

      <Panel title="내 GitHub 레포지토리">
        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-xs leading-6 text-cyan-50/90">
          <p className="font-semibold">GitHub API 연결됨 · source: {repoSource}</p>
          <p className="mt-1">목록은 live GitHub API를 우선 사용하고 실패 시 GitHub cache로 fallback합니다. Add to Ops는 현재 Supabase ops_projects에 저장됩니다.</p>
        </div>
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-50">
            {error}
          </div>
        )}
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
                  {repo.managed ? (
                    <Link href={`/ops/projects/${repo.project?.id || toProjectId(repo)}`} className="rounded-2xl bg-emerald-200 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-emerald-100">
                      Managed canvas 열기
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToOps(repo.repo)}
                      disabled={isPending && pendingRepo === repo.repo}
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-cyan-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isPending && pendingRepo === repo.repo ? "Adding..." : "Add to Ops"}
                    </button>
                  )}
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
