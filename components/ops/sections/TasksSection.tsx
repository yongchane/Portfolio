"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Panel, TaskRow } from "@/components/ops/shared";
import type { TasksSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";
import type { Task } from "@/lib/ops/types";

export function TasksSection({ data, notesById, githubReposByName, setSection, setSelectedProjectId }: TasksSectionProps) {
  const router = useRouter();
  const [activeTaskId, setActiveTaskId] = useState<string>(data.tasks[0]?.id ?? "");
  const [draftByTaskId, setDraftByTaskId] = useState<Record<string, { status: Task["status"]; summary: string; nextActions: string; needsDecision: string }>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeTask = useMemo(() => data.tasks.find((task) => task.id === activeTaskId) || data.tasks[0], [data.tasks, activeTaskId]);
  const activeProject = activeTask ? data.projects.find((project) => project.id === activeTask.projectId) : undefined;
  const activeRepo = activeProject?.repo ? githubReposByName.get(activeProject.repo) : undefined;
  const activeDraft = activeTask ? (draftByTaskId[activeTask.id] || {
    status: activeTask.status,
    summary: activeTask.summary,
    nextActions: activeTask.nextActions.join("\n"),
    needsDecision: (activeTask.needsDecision || []).join("\n"),
  }) : null;

  async function saveTask() {
    if (!activeTask || !activeDraft) return;
    setSaveMessage(null);

    const response = await fetch(`/api/ops/tasks/${activeTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: activeDraft.status,
        summary: activeDraft.summary,
        nextActions: activeDraft.nextActions.split("\n").map((item) => item.trim()).filter(Boolean),
        needsDecision: activeDraft.needsDecision.split("\n").map((item) => item.trim()).filter(Boolean),
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setSaveMessage(payload?.message || "작업 저장에 실패했습니다.");
      return;
    }

    setSaveMessage("tasks.json에 저장했고 화면을 새로고침합니다.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Tasks</p>
        <h2 className="mb-3 text-4xl font-bold">애옹 작업 관리</h2>
        <p className="max-w-3xl text-white/70">상태 요약이 아니라, 실제 한 일 / 다음 액션 / 판단 필요 / 노트 근거 / 연결된 GitHub repo 상태까지 함께 보는 실행 추적 화면입니다.</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {data.tasks.map((task) => {
            const project = data.projects.find((p) => p.id === task.projectId);
            const repo = project?.repo ? githubReposByName.get(project.repo) : undefined;
            return (
              <button key={task.id} onClick={() => setActiveTaskId(task.id)} className="block w-full text-left">
                <div className={task.id === activeTask?.id ? "rounded-[28px] ring-2 ring-white/20" : ""}>
                  <TaskRow task={task} projectName={project?.name || "-"} notesById={notesById} repo={repo} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="space-y-6">
          <Panel title="Task write path (MVP)">
            {activeTask && activeDraft ? (
              <div className="space-y-4 text-sm text-white/80">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">선택된 작업</p>
                  <strong className="text-base">{activeTask.title}</strong>
                  <p className="mt-1 text-white/60">{activeProject?.name || "-"} · updated {activeTask.updatedAt}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-xs leading-6 text-emerald-50/90">
                  인증된 `/ops`에서만 동작하는 로컬 JSON write path입니다. 현재는 `data/ops/tasks.json`을 수정하는 MVP라서 다중 사용자 동시 편집이나 Supabase sync write는 아직 아닙니다.
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">상태</span>
                  <select
                    value={activeDraft.status}
                    onChange={(event) => setDraftByTaskId((current) => ({ ...current, [activeTask.id]: { ...activeDraft, status: event.target.value as Task["status"] } }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
                  >
                    <option value="planned">planned</option>
                    <option value="doing">doing</option>
                    <option value="verifying">verifying</option>
                    <option value="shipped">shipped</option>
                    <option value="blocked">blocked</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">요약</span>
                  <textarea value={activeDraft.summary} onChange={(event) => setDraftByTaskId((current) => ({ ...current, [activeTask.id]: { ...activeDraft, summary: event.target.value } }))} rows={4} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">다음 액션 (줄바꿈 구분)</span>
                  <textarea value={activeDraft.nextActions} onChange={(event) => setDraftByTaskId((current) => ({ ...current, [activeTask.id]: { ...activeDraft, nextActions: event.target.value } }))} rows={5} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">판단 필요 (줄바꿈 구분)</span>
                  <textarea value={activeDraft.needsDecision} onChange={(event) => setDraftByTaskId((current) => ({ ...current, [activeTask.id]: { ...activeDraft, needsDecision: event.target.value } }))} rows={4} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
                </label>
                <button onClick={() => void saveTask()} disabled={isPending} className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-60">{isPending ? "저장 후 새로고침 중..." : "작업 저장"}</button>
                {saveMessage && <p className="text-xs text-white/60">{saveMessage}</p>}
                {activeRepo && <p className="text-xs text-white/45">GitHub 참고: issues {activeRepo.openIssuesCount ?? 0} · PRs {activeRepo.openPullRequestsCount ?? 0} · pushed {formatDateTime(activeRepo.pushedAt)}</p>}
              </div>
            ) : (
              <p className="text-sm text-white/60">수정할 작업이 없습니다.</p>
            )}
          </Panel>
          <Panel title="왜 이 페이지가 중요한가">
            <ul className="list-disc space-y-3 pl-4 text-sm text-white/80">
              <li>애옹이 무슨 작업을 했는지 추적</li>
              <li>완료와 검증을 분리해서 보기</li>
              <li>문제/오해/판단 필요를 빠르게 찾기</li>
              <li>작업을 노트와 GitHub 근거에 연결해 협업 자산으로 축적</li>
            </ul>
          </Panel>
          <Panel title="GitHub attention">
            <div className="space-y-3 text-sm text-white/80">
              {data.projects.filter((project) => project.repo).map((project) => {
                const repo = project.repo ? githubReposByName.get(project.repo) : undefined;
                if (!repo) return null;
                return (
                  <button key={project.id} onClick={() => {
                    setSelectedProjectId(project.id);
                    setSection("projects");
                  }} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10">
                    <p className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">{project.name}</p>
                    <strong>{repo.repo}</strong>
                    <p className="mt-2 text-white/70">open issues {repo.openIssuesCount ?? 0} · open PRs {repo.openPullRequestsCount ?? 0}</p>
                    <p className="mt-1 text-xs text-white/45">default {repo.defaultBranch} · pushed {formatDateTime(repo.pushedAt)}</p>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
