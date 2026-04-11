import { Panel, TaskRow } from "@/components/ops/shared";
import type { TasksSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

export function TasksSection({ data, notesById, githubReposByName, setSection, setSelectedProjectId }: TasksSectionProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Tasks</p>
        <h2 className="mb-3 text-4xl font-bold">애옹 작업 관리</h2>
        <p className="max-w-3xl text-white/70">상태 요약이 아니라, 실제 한 일 / 다음 액션 / 판단 필요 / 노트 근거 / 연결된 GitHub repo 상태까지 함께 보는 실행 추적 화면입니다.</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {data.tasks.map((task) => {
            const project = data.projects.find((p) => p.id === task.projectId);
            const repo = project?.repo ? githubReposByName.get(project.repo) : undefined;
            return <TaskRow key={task.id} task={task} projectName={project?.name || "-"} notesById={notesById} repo={repo} />;
          })}
        </div>
        <div className="space-y-6">
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
