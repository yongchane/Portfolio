import clsx from "clsx";
import type {
  GitHubProjectBoardSnapshot,
  GitHubReleaseSnapshot,
  GitHubRepoSnapshot,
  NoteItem,
  Project,
  ProjectChecklistItem,
  ProjectSectorProgress,
  Task,
} from "@/lib/ops/types";
import { noteTypeMeta, progressMeta, projectStageMeta, taskStatusMeta } from "@/components/ops/config";
import { formatDateTime } from "@/components/ops/utils";

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <p className="mb-2 text-sm text-white/55">{label}</p>
      <strong className="text-3xl font-bold">{value}</strong>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-white/45">{title}</p>
      {children}
    </div>
  );
}

export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="break-all">{value}</p>
    </div>
  );
}

export function TaskRow({ task, projectName, notesById, compact = false, repo }: { task: Task; projectName: string; notesById: Map<string, NoteItem>; compact?: boolean; repo?: GitHubRepoSnapshot; }) {
  const linkedNotes = (task.noteIds || []).map((noteId) => notesById.get(noteId)).filter((note): note is NoteItem => Boolean(note));

  return (
    <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{projectName} · {task.category}</p>
          <h3 className={clsx(compact ? "text-xl" : "text-2xl", "font-semibold")}>{task.title}</h3>
          <p className="mt-2 text-sm text-white/70">{task.summary}</p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", taskStatusMeta[task.status].tone)}>{taskStatusMeta[task.status].label}</span>
          <span className="text-xs text-white/45">{task.updatedAt}</span>
        </div>
      </div>
      <div className={clsx("grid gap-4", compact ? "md:grid-cols-2" : "md:grid-cols-[1fr_1fr_0.95fr]")}>
        <div>
          <p className="mb-2 text-sm font-semibold text-white/55">완료된 작업</p>
          <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
            {task.completedWork.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-white/55">다음 액션</p>
          <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
            {task.nextActions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        {!compact && (
          <div>
            <p className="mb-2 text-sm font-semibold text-white/55">판단 / 근거</p>
            <div className="space-y-2 text-sm text-white/75">
              <p>Docs: {task.relatedDocs?.join(", ") || "-"}</p>
              <p>Commits: {task.relatedCommits?.join(", ") || "-"}</p>
              <p>Linked notes: {linkedNotes.length || 0}개</p>
              <p>Decision: {task.needsDecision?.join(" / ") || "-"}</p>
              {repo && <p>GitHub: issues {repo.openIssuesCount ?? 0} · PRs {repo.openPullRequestsCount ?? 0} · pushed {formatDateTime(repo.pushedAt)}</p>}
              {linkedNotes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {linkedNotes.map((note) => (
                    <span key={note.id} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">{note.title}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function SectorRow({ sector }: { sector: ProjectSectorProgress }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong>{sector.label}</strong>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", progressMeta[sector.status].tone)}>{progressMeta[sector.status].label}</span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-white/10">
        <div className={clsx("h-2 rounded-full", progressMeta[sector.status].bar, sector.status === "todo" ? "w-1/4" : sector.status === "doing" ? "w-2/3" : sector.status === "blocked" ? "w-1/3" : "w-full")} />
      </div>
      <p className="text-sm text-white/70">{sector.summary}</p>
    </div>
  );
}

export function ChecklistRow({ item }: { item: ProjectChecklistItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong>{item.label}</strong>
          {item.note && <p className="mt-2 text-sm text-white/70">{item.note}</p>}
        </div>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", progressMeta[item.status].tone)}>{progressMeta[item.status].label}</span>
      </div>
    </div>
  );
}

export function GitHubRepoCard({ project, repo, onOpen }: { project: Project; repo?: GitHubRepoSnapshot; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left transition hover:bg-white/10">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{project.name}</p>
      <strong className="text-lg">{project.repo || "repo 미연결"}</strong>
      <p className="mt-2 text-sm text-white/70">{repo?.description || project.summary}</p>
      <div className="mt-4 grid gap-2 text-xs text-white/55 md:grid-cols-2">
        <span>issues {repo?.openIssuesCount ?? 0}</span>
        <span>PRs {repo?.openPullRequestsCount ?? 0}</span>
        <span>branch {repo?.defaultBranch || project.branch || "-"}</span>
        <span>updated {formatDateTime(repo?.updatedAt)}</span>
      </div>
    </button>
  );
}

export function GitHubRepoDetail({ repo }: { repo: GitHubRepoSnapshot }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <strong className="text-base">{repo.repo}</strong>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{repo.visibility}</span>
        {repo.primaryLanguage && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{repo.primaryLanguage}</span>}
      </div>
      <p className="mb-4 text-white/70">{repo.description || "설명 없음"}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoTile label="Default branch" value={repo.defaultBranch} />
        <InfoTile label="Open issues / PRs" value={`${repo.openIssuesCount ?? 0} / ${repo.openPullRequestsCount ?? 0}`} />
        <InfoTile label="Stars / Forks / Watchers" value={`${repo.stargazerCount ?? 0} / ${repo.forkCount ?? 0} / ${repo.watchersCount ?? 0}`} />
        <InfoTile label="Pushed at" value={formatDateTime(repo.pushedAt)} />
      </div>
      {!!repo.topics?.length && <p className="mt-3 text-xs text-white/50">topics: {repo.topics.join(" · ")}</p>}
    </div>
  );
}

export function ProjectBoardCard({ board }: { board: GitHubProjectBoardSnapshot }) {
  return (
    <a href={board.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong>{board.title}</strong>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", board.closed ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700")}>{board.closed ? "closed" : "active"}</span>
      </div>
      <p className="text-sm text-white/70">{board.owner} · #{board.number} · items {board.itemCount ?? 0}</p>
      {!!board.fieldNames?.length && <p className="mt-2 text-xs text-white/50">fields: {board.fieldNames.slice(0, 6).join(" · ")}</p>}
    </a>
  );
}

export function ReleaseCard({ release, compact = false }: { release: GitHubReleaseSnapshot; compact?: boolean }) {
  return (
    <a href={release.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">{release.repo}</p>
          <strong>{release.name}</strong>
          <p className="mt-1 text-sm text-white/65">{release.tagName} · {formatDateTime(release.publishedAt)}</p>
          {!compact && release.description && <p className="mt-3 text-sm text-white/75">{release.description}</p>}
        </div>
        <div className="flex gap-2">
          {release.isPrerelease && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">pre</span>}
          {release.isDraft && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">draft</span>}
        </div>
      </div>
    </a>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8">
      <h3 className="mb-2 text-2xl font-semibold">{title}</h3>
      <p className="text-white/70">{description}</p>
    </div>
  );
}

export function EmptyLine({ message }: { message: string }) {
  return <p className="text-sm text-white/55">{message}</p>;
}

export { noteTypeMeta, projectStageMeta };
