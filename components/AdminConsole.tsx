"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type {
  GitHubProjectBoardSnapshot,
  GitHubReleaseSnapshot,
  GitHubRepoSnapshot,
  NoteItem,
  OpsConsoleData,
  ProgressState,
  Project,
  ProjectChecklistItem,
  ProjectSectorProgress,
  ProjectStage,
  Task,
  TaskStatus,
  NoteType,
} from "@/lib/ops/types";

const taskStatusMeta: Record<TaskStatus, { label: string; tone: string }> = {
  planned: { label: "예정", tone: "bg-slate-100 text-slate-700" },
  doing: { label: "진행 중", tone: "bg-amber-100 text-amber-700" },
  verifying: { label: "검증 중", tone: "bg-sky-100 text-sky-700" },
  shipped: { label: "완료", tone: "bg-emerald-100 text-emerald-700" },
  blocked: { label: "막힘", tone: "bg-rose-100 text-rose-700" },
};

const projectStageMeta: Record<ProjectStage, { label: string; tone: string }> = {
  idea: { label: "아이디어", tone: "bg-slate-100 text-slate-700" },
  planning: { label: "기획", tone: "bg-fuchsia-100 text-fuchsia-700" },
  building: { label: "개발 중", tone: "bg-amber-100 text-amber-700" },
  verifying: { label: "검증 중", tone: "bg-sky-100 text-sky-700" },
  live: { label: "운영 중", tone: "bg-emerald-100 text-emerald-700" },
};

const noteTypeMeta: Record<NoteType, { label: string; tone: string }> = {
  "daily-chat-log": { label: "Daily Log", tone: "bg-sky-100 text-sky-700" },
  "project-ops": { label: "Project Note", tone: "bg-fuchsia-100 text-fuchsia-700" },
  "aeyong-debug": { label: "Aeyong Note", tone: "bg-amber-100 text-amber-700" },
  "weekly-review": { label: "Review", tone: "bg-emerald-100 text-emerald-700" },
  reference: { label: "Docs", tone: "bg-violet-100 text-violet-700" },
};

const progressMeta: Record<ProgressState, { label: string; tone: string; bar: string }> = {
  todo: { label: "대기", tone: "bg-slate-100 text-slate-700", bar: "bg-slate-500" },
  doing: { label: "진행 중", tone: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  done: { label: "완료", tone: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
  blocked: { label: "막힘", tone: "bg-rose-100 text-rose-700", bar: "bg-rose-400" },
};

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "projects", label: "Projects" },
  { id: "notes", label: "Notes" },
  { id: "releases", label: "Releases" },
  { id: "settings", label: "Settings" },
] as const;

type SectionId = (typeof sidebarItems)[number]["id"];

export default function AdminConsole({ authenticated, data }: { authenticated: boolean; data: OpsConsoleData | null }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(data?.projects[0]?.id ?? "");
  const [selectedNoteId, setSelectedNoteId] = useState<string>(data?.notes[0]?.id ?? "");
  const [noteQuery, setNoteQuery] = useState("");
  const [liveStatus, setLiveStatus] = useState<{ mode: string; generatedAt: string; notesCount: number } | null>(null);
  const lastSeenGeneratedAt = useRef(data?.dataSource.generatedAt ?? "");

  const selectedProject = data?.projects.find((item) => item.id === selectedProjectId) || data?.projects[0];
  const projectTasks = data?.tasks.filter((task) => task.projectId === selectedProject?.id) || [];
  const notesById = useMemo(() => new Map((data?.notes || []).map((note) => [note.id, note])), [data?.notes]);
  const githubReposByName = useMemo(() => new Map((data?.github.repoSnapshots || []).map((repo) => [repo.repo, repo])), [data?.github.repoSnapshots]);
  const projectBoardsByOwner = useMemo(() => {
    const map = new Map<string, GitHubProjectBoardSnapshot[]>();
    for (const board of data?.github.projectBoards || []) {
      const list = map.get(board.owner) || [];
      list.push(board);
      map.set(board.owner, list);
    }
    return map;
  }, [data?.github.projectBoards]);

  const filteredNotes = useMemo(() => {
    const notes = data?.notes || [];
    const query = noteQuery.trim().toLowerCase();
    if (!query) return notes;

    return notes.filter((note) => {
      const haystack = [note.title, note.summary, note.path, note.project, note.tags.join(" "), note.headings.join(" "), note.rawExcerpt]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data?.notes, noteQuery]);

  const selectedNote = filteredNotes.find((item) => item.id === selectedNoteId) || filteredNotes[0] || data?.notes[0];

  const summary = useMemo(
    () => ({
      totalProjects: data?.projects.length || 0,
      activeTasks: data?.tasks.filter((task) => task.status === "doing").length || 0,
      verifyingTasks: data?.tasks.filter((task) => task.status === "verifying").length || 0,
      notesCount: data?.notes.length || 0,
      githubRepos: data?.github.repoSnapshots.length || 0,
      githubBoards: data?.github.projectBoards.length || 0,
      mappedNotes: data?.vault.projectMappedCount || 0,
      orphanNotes: data?.vault.orphanNoteIds.length || 0,
    }),
    [data?.projects.length, data?.tasks, data?.notes.length, data?.github.repoSnapshots.length, data?.github.projectBoards.length, data?.vault.projectMappedCount, data?.vault.orphanNoteIds.length],
  );

  const attentionTasks = (data?.tasks || [])
    .filter((task) => task.status === "blocked" || task.status === "verifying" || (task.needsDecision?.length ?? 0) > 0)
    .slice(0, 4);

  const selectedRepo = selectedProject?.repo ? githubReposByName.get(selectedProject.repo) : undefined;
  const selectedProjectBoards = selectedRepo ? projectBoardsByOwner.get(selectedRepo.owner) || [] : [];
  const selectedProjectReleases = selectedRepo
    ? (data?.github.releases || []).filter((release) => release.repo === selectedRepo.repo).slice(0, 4)
    : [];
  const selectedProjectNotes = useMemo(
    () => (data?.notes || []).filter((note) => note.project === selectedProject?.name || note.project === selectedProject?.repo || note.path.toLowerCase().includes(selectedProject?.name.toLowerCase() || "")),
    [data?.notes, selectedProject?.name, selectedProject?.repo],
  );
  const vaultLinksByNoteId = useMemo(() => new Map((data?.vault.links || []).map((entry) => [entry.noteId, entry])), [data?.vault.links]);
  const projectRepoHealth = useMemo(() => {
    if (!selectedRepo) return null;
    const issuePressure = (selectedRepo.openIssuesCount ?? 0) + (selectedRepo.openPullRequestsCount ?? 0);
    const pushedAt = selectedRepo.pushedAt ? new Date(selectedRepo.pushedAt).getTime() : 0;
    const daysSincePush = pushedAt ? Math.floor((Date.now() - pushedAt) / (1000 * 60 * 60 * 24)) : null;
    const branchAligned = !selectedProject?.branch || selectedProject.branch === selectedRepo.defaultBranch;
    const score = Math.max(0, 100 - issuePressure * 8 - (daysSincePush && daysSincePush > 14 ? Math.min(35, daysSincePush - 14) : 0) - (branchAligned ? 0 : 12));
    return {
      score,
      issuePressure,
      daysSincePush,
      branchAligned,
      releaseCount: selectedProjectReleases.length,
    };
  }, [selectedProject?.branch, selectedProjectReleases.length, selectedRepo]);

  const releaseProjects = useMemo(() => {
    return data?.projects.filter((project) => project.repo).map((project) => {
      const repo = project.repo ? githubReposByName.get(project.repo) : undefined;
      const releases = (data?.github.releases || []).filter((release) => release.repo === project.repo);
      const latestRelease = releases[0];
      const pushedAt = repo?.pushedAt ? new Date(repo.pushedAt).getTime() : 0;
      const daysSincePush = pushedAt ? Math.floor((Date.now() - pushedAt) / (1000 * 60 * 60 * 24)) : null;
      const branchAligned = !project.branch || !repo || project.branch === repo.defaultBranch;
      return {
        project,
        repo,
        releases,
        latestRelease,
        daysSincePush,
        branchAligned,
      };
    }) || [];
  }, [data?.github.releases, data?.projects, githubReposByName]);

  useEffect(() => {
    if (!filteredNotes.length) return;
    if (!filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    if (!data) return;
    lastSeenGeneratedAt.current = data.dataSource.generatedAt;
    setLiveStatus({ mode: data.dataSource.mode, generatedAt: data.dataSource.generatedAt, notesCount: data.dataSource.notesCount });
  }, [data]);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/ops/notes-version", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        setLiveStatus(payload);
        if (payload.generatedAt && payload.generatedAt !== lastSeenGeneratedAt.current) {
          lastSeenGeneratedAt.current = payload.generatedAt;
          router.refresh();
        }
      } catch {
        // ignore transient polling failures
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authenticated, router]);

  async function handleUnlock() {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/ops/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: input }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setAuthError(payload?.message || "접근 코드 확인에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setAuthError("잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authenticated || !data) {
    return (
      <section className="min-h-screen bg-[#0b1020] px-6 py-24 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/50">Private Ops Console</p>
          <h1 className="mb-3 text-3xl font-bold">운영 콘솔 접근</h1>
          <p className="mb-6 text-white/70">개인 관리자 페이지입니다. 접근 코드를 입력해 주세요.</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSubmitting) {
                void handleUnlock();
              }
            }}
            placeholder="access code"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />
          <button
            onClick={() => void handleUnlock()}
            disabled={isSubmitting || !input.trim()}
            className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "확인 중..." : "입장하기"}
          </button>
          {authError && <p className="mt-3 text-sm text-rose-300">{authError}</p>}
          <p className="mt-3 text-xs text-white/40">이제 잠금 화면에서는 운영 데이터가 서버 응답에 포함되지 않습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#0b1020] text-white">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-white/10 bg-black/20 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/40">Aeyong OS</p>
          <h1 className="mb-8 text-2xl font-bold">현용찬 운영 콘솔</h1>
          <nav className="mb-8 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={clsx(
                  "w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                  section === item.id ? "bg-white text-black" : "bg-white/5 text-white/75 hover:bg-white/10",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <Panel title="운영 원칙">
            <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
              <li>결론 먼저 보고</li>
              <li>main 브랜치는 명시 허락 전 금지</li>
              <li>완료와 검증을 분리</li>
              <li>작업 카드에 근거/다음 액션/판단 필요를 같이 둔다</li>
            </ul>
          </Panel>

          <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-200/70">Notes Sync</p>
            <p className="text-sm text-white/85">
              mode: <strong>{liveStatus?.mode || data.dataSource.mode}</strong>
            </p>
            <p className="mt-1 text-xs text-white/55">notes {liveStatus?.notesCount ?? data.dataSource.notesCount}개 · updated {liveStatus?.generatedAt || data.dataSource.generatedAt}</p>
            <p className="mt-2 text-xs text-white/50">/ops가 주기적으로 source 변경을 확인하고, 노트가 바뀌면 화면을 자동 refresh합니다.</p>
          </div>

          <div className="mt-4 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-100/70">GitHub Sync</p>
            <p className="text-sm text-white/85">
              {data.github.mode === "live" ? "read-only live cache" : "fallback cache"} · {data.github.account || "unknown"}
            </p>
            <p className="mt-1 text-xs text-white/55">repos {data.github.repoSnapshots.length} · boards {data.github.projectBoards.length} · releases {data.github.releases.length}</p>
            <p className="mt-2 text-xs text-white/50">generated {formatDateTime(data.github.generatedAt)}</p>
          </div>
        </aside>

        <main className="p-6 lg:p-10">
          {section === "overview" && (
            <div className="space-y-8">
              <header>
                <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Overview</p>
                <h2 className="mb-3 text-4xl font-bold">오늘의 운영 상황</h2>
                <p className="max-w-3xl text-white/70">애옹 작업, 프로젝트 상태, synced notes snapshot, GitHub repo/project layer, 사용자 판단 필요 항목을 한 번에 보는 홈 화면입니다.</p>
              </header>

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
                <SummaryCard label="전체 프로젝트" value={String(summary.totalProjects)} />
                <SummaryCard label="진행 중 작업" value={String(summary.activeTasks)} />
                <SummaryCard label="검증 중 작업" value={String(summary.verifyingTasks)} />
                <SummaryCard label="저장된 노트" value={String(summary.notesCount)} />
                <SummaryCard label="Project-linked notes" value={String(summary.mappedNotes)} />
                <SummaryCard label="Vault orphan" value={String(summary.orphanNotes)} />
                <SummaryCard label="GitHub repos" value={String(summary.githubRepos)} />
                <SummaryCard label="GitHub boards" value={String(summary.githubBoards)} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Panel title="사용자 판단 필요">
                  <div className="space-y-4">
                    {attentionTasks.map((task) => (
                      <TaskRow key={task.id} task={task} projectName={data.projects.find((p) => p.id === task.projectId)?.name || "-"} notesById={notesById} compact />
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
                          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[note.type].tone)}>{noteTypeMeta[note.type].label}</span>
                        </div>
                        <p className="mb-2 text-sm text-white/70">{note.summary}</p>
                        <p className="text-xs text-white/45">{note.path}</p>
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Panel title="Vault operating signals">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Hot folders</p>
                      <div className="space-y-2">
                        {data.vault.folders.slice(0, 4).map((folder) => (
                          <div key={folder.folder} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
                            <span className="truncate">{folder.folder}</span>
                            <span className="text-xs text-white/45">{folder.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Tag clusters</p>
                      <div className="flex flex-wrap gap-2">
                        {data.vault.tags.slice(0, 8).map((tag) => (
                          <span key={tag.tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">#{tag.tag} · {tag.count}</span>
                        ))}
                        {!data.vault.tags.length && <EmptyLine message="아직 집계된 태그가 없습니다." />}
                      </div>
                    </div>
                  </div>
                </Panel>
                <Panel title="GitHub 연결 현황">
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.projects.filter((project) => project.repo).map((project) => (
                      <GitHubRepoCard key={project.id} project={project} repo={project.repo ? githubReposByName.get(project.repo) : undefined} onOpen={() => {
                        setSelectedProjectId(project.id);
                        setSection("projects");
                      }} />
                    ))}
                  </div>
                </Panel>
                <Panel title="최근 GitHub 릴리즈">
                  <div className="space-y-3">
                    {data.github.releases.slice(0, 5).map((release) => (
                      <ReleaseCard key={release.id} release={release} compact />
                    ))}
                    {!data.github.releases.length && <EmptyLine message="릴리즈 데이터가 아직 없습니다. sync 후 이곳에 최신 release가 표시됩니다." />}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {section === "tasks" && (
            <div className="space-y-8">
              <header>
                <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Tasks</p>
                <h2 className="mb-3 text-4xl font-bold">애옹 작업 관리</h2>
                <p className="max-w-3xl text-white/70">상태 요약이 아니라, 실제 한 일 / 다음 액션 / 판단 필요 / 노트 근거 / 연결된 GitHub repo 상태까지 함께 보는 실행 추적 화면입니다.</p>
              </header>
              <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                  {data.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      projectName={data.projects.find((p) => p.id === task.projectId)?.name || "-"}
                      notesById={notesById}
                      repo={data.projects.find((p) => p.id === task.projectId)?.repo ? githubReposByName.get(data.projects.find((p) => p.id === task.projectId)?.repo || "") : undefined}
                    />
                  ))}
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
          )}

          {section === "projects" && selectedProject && (
            <div className="space-y-8">
              <header>
                <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Projects</p>
                <h2 className="mb-3 text-4xl font-bold">프로젝트 운영 관리</h2>
                <p className="max-w-3xl text-white/70">기획 → 개발 → 배포 → 운영 흐름을 프로젝트 단위로 관리합니다. sector progress, spec checklist, GitHub repo 상태를 한 화면에서 봅니다.</p>
              </header>
              <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
                <div className="space-y-3">
                  {data.projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={clsx(
                        "w-full rounded-3xl border p-4 text-left transition",
                        selectedProject.id === project.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <strong className="text-lg">{project.name}</strong>
                        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", projectStageMeta[project.stage].tone)}>{projectStageMeta[project.stage].label}</span>
                      </div>
                      <p className="text-sm text-white/70">{project.summary}</p>
                    </button>
                  ))}
                </div>
                <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-3xl font-bold">{selectedProject.name}</h3>
                      <p className="mt-2 max-w-3xl text-white/70">{selectedProject.summary}</p>
                    </div>
                    <span className={clsx("rounded-full px-3 py-1 text-sm font-semibold", projectStageMeta[selectedProject.stage].tone)}>{projectStageMeta[selectedProject.stage].label}</span>
                  </div>

                  <div className="grid gap-4 text-sm text-white/75 md:grid-cols-2 xl:grid-cols-8">
                    <InfoTile label="Repository" value={selectedProject.repo || "-"} />
                    <InfoTile label="Branch" value={selectedProject.branch || "-"} />
                    <InfoTile label="Deploy" value={selectedProject.deployUrl || "-"} />
                    <InfoTile label="Docs" value={selectedProject.docs?.join(", ") || "-"} />
                    <InfoTile label="Linked notes" value={String(selectedProjectNotes.length)} />
                    <InfoTile label="Connected tasks" value={String(projectTasks.length)} />
                    <InfoTile label="Boards / releases" value={`${selectedProjectBoards.length} / ${selectedProjectReleases.length}`} />
                    <InfoTile label="Repo health" value={projectRepoHealth ? `${projectRepoHealth.score}/100` : "-"} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel title="Sector progress">
                      <div className="space-y-3">
                        {(selectedProject.sectors || []).map((sector) => <SectorRow key={sector.id} sector={sector} />)}
                        {!selectedProject.sectors?.length && <EmptyLine message="아직 sector progress가 정의되지 않았습니다." />}
                      </div>
                    </Panel>
                    <Panel title="Spec checklist">
                      <div className="space-y-3">
                        {(selectedProject.checklist || []).map((item) => <ChecklistRow key={item.id} item={item} />)}
                        {!selectedProject.checklist?.length && <EmptyLine message="아직 checklist가 정의되지 않았습니다." />}
                      </div>
                    </Panel>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-3">
                    <Panel title="Operating cadence">
                      <div className="space-y-3">
                        {(selectedProject.operatingCadence || []).map((item) => (
                          <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{item}</div>
                        ))}
                        {!selectedProject.operatingCadence?.length && <EmptyLine message="운영 cadence가 아직 정의되지 않았습니다." />}
                      </div>
                    </Panel>
                    <Panel title="Admin surfaces">
                      <div className="space-y-3">
                        {(selectedProject.adminSurfaces || []).map((surface) => (
                          <a key={surface.id} href={surface.href || "#"} target={surface.href ? "_blank" : undefined} rel={surface.href ? "noreferrer" : undefined} className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-sm transition hover:bg-white/10">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <strong>{surface.label}</strong>
                              <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", progressMeta[surface.status].tone)}>{progressMeta[surface.status].label}</span>
                            </div>
                            <p className="text-white/70">{surface.summary}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/40">{surface.kind}</p>
                          </a>
                        ))}
                        {!selectedProject.adminSurfaces?.length && <EmptyLine message="연결된 운영 surface가 없습니다." />}
                      </div>
                    </Panel>
                    <Panel title="Vault views">
                      <div className="space-y-3">
                        {(selectedProject.vaultViews || []).map((view) => (
                          <div key={view} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{view}</div>
                        ))}
                        {!selectedProject.vaultViews?.length && <EmptyLine message="추천 vault view가 아직 없습니다." />}
                      </div>
                    </Panel>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                    <Panel title="Connected tasks">
                      <div className="space-y-4">
                        {projectTasks.map((task) => (
                          <TaskRow key={task.id} task={task} projectName={selectedProject.name} notesById={notesById} compact repo={selectedRepo} />
                        ))}
                        {!projectTasks.length && <EmptyLine message="연결된 task가 없습니다." />}
                      </div>
                    </Panel>
                    <Panel title="GitHub repo / project layer">
                      <div className="space-y-4">
                        {selectedRepo ? <GitHubRepoDetail repo={selectedRepo} /> : <EmptyLine message="이 프로젝트는 repo가 연결되지 않았습니다." />}
                        {projectRepoHealth && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <InfoTile label="Health score" value={`${projectRepoHealth.score}/100`} />
                            <InfoTile label="Branch alignment" value={projectRepoHealth.branchAligned ? "tracked branch aligned" : "project branch != repo default"} />
                            <InfoTile label="Issue pressure" value={String(projectRepoHealth.issuePressure)} />
                            <InfoTile label="Days since push" value={projectRepoHealth.daysSincePush != null ? String(projectRepoHealth.daysSincePush) : "-"} />
                          </div>
                        )}
                        {!!selectedProject.githubFocus?.length && (
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                            <p className="mb-3 text-sm font-semibold text-white/55">GitHub focus</p>
                            <ul className="list-disc space-y-2 pl-4">
                              {selectedProject.githubFocus.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                          </div>
                        )}
                        {selectedProjectBoards.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-white/55">Project boards</p>
                            {selectedProjectBoards.slice(0, 4).map((board) => (
                              <ProjectBoardCard key={board.id} board={board} />
                            ))}
                          </div>
                        ) : (
                          <EmptyLine message={selectedRepo ? "조회 가능한 GitHub Project board가 없거나 권한 범위 밖입니다." : "repo 연결 후 project board를 표시합니다."} />
                        )}
                        {selectedProjectReleases.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-white/55">Recent releases</p>
                            {selectedProjectReleases.map((release) => (
                              <ReleaseCard key={release.id} release={release} compact />
                            ))}
                          </div>
                        )}
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="mb-3 text-sm font-semibold text-white/55">Linked vault notes</p>
                          <p className="mb-3 text-xs text-white/45">{selectedProjectNotes.length}개 note · source {data.dataSource.mode} · vault mapped {data.vault.projectMappedCount}</p>
                          <div className="space-y-3">
                            {selectedProjectNotes.slice(0, 5).map((note) => {
                              const linkStats = vaultLinksByNoteId.get(note.id);
                              return (
                                <button key={note.id} onClick={() => {
                                  setSelectedNoteId(note.id);
                                  setSection("notes");
                                }} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                                  <div className="flex items-center justify-between gap-3">
                                    <strong>{note.title}</strong>
                                    <span className="text-xs text-white/45">↗ {linkStats?.linkedBy.length || 0} · → {linkStats?.linksTo.length || 0}</span>
                                  </div>
                                  <p className="mt-2 text-sm text-white/70">{note.summary}</p>
                                </button>
                              );
                            })}
                            {!selectedProjectNotes.length && <EmptyLine message="아직 project와 연결된 vault note가 부족합니다." />}
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === "notes" && (
            <div className="space-y-8">
              <header>
                <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Notes</p>
                <h2 className="mb-3 text-4xl font-bold">Vault / Notes Console</h2>
                <p className="max-w-3xl text-white/70">Obsidian/문서 원본을 live source로 읽고, note 간 링크/폴더/태그/작업 연결까지 함께 보여줍니다. 이제 `/ops`의 Notes는 단순 viewer가 아니라 vault operating layer 역할을 합니다.</p>
              </header>
              <div className="grid gap-4 xl:grid-cols-[320px_360px_1fr]">
                <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                    <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">Vault health</p>
                    <div className="grid gap-3">
                      <InfoTile label="Templates" value={String(data.vault.templatesCount)} />
                      <InfoTile label="Project mapped" value={String(data.vault.projectMappedCount)} />
                      <InfoTile label="Orphan notes" value={String(data.vault.orphanNoteIds.length)} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">노트 검색</label>
                    <input
                      value={noteQuery}
                      onChange={(event) => setNoteQuery(event.target.value)}
                      placeholder="제목, 태그, 경로, 내용 검색"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    />
                    <p className="mt-2 text-xs text-white/45">{filteredNotes.length} / {data.notes.length}개 노트 표시 · synced {data.dataSource.generatedAt || "미기록"}</p>
                  </div>
                  <div className="max-h-[62vh] space-y-3 overflow-auto pr-1">
                    {filteredNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={clsx(
                          "w-full rounded-3xl border p-4 text-left transition",
                          selectedNote?.id === note.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <strong>{note.title}</strong>
                          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[note.type].tone)}>{noteTypeMeta[note.type].label}</span>
                        </div>
                        <p className="mb-2 text-sm text-white/70">{note.summary}</p>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {note.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">#{tag}</span>
                          ))}
                        </div>
                        <p className="text-xs text-white/45">{note.path}</p>
                      </button>
                    ))}
                    {!filteredNotes.length && <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">검색 조건에 맞는 노트가 없습니다. 다른 키워드를 시도해 주세요.</div>}
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <Panel title="Folder buckets">
                    <div className="space-y-3">
                      {data.vault.folders.slice(0, 8).map((folder) => (
                        <div key={folder.folder} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                          <div className="flex items-center justify-between gap-3">
                            <strong className="truncate">{folder.folder}</strong>
                            <span className="text-xs text-white/45">{folder.count}</span>
                          </div>
                          <p className="mt-2 text-xs text-white/45">{folder.noteIds.slice(0, 3).join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Popular tags">
                    <div className="flex flex-wrap gap-2">
                      {data.vault.tags.map((tag) => (
                        <button key={tag.tag} onClick={() => setNoteQuery(tag.tag)} className="rounded-full bg-black/20 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10">#{tag.tag} · {tag.count}</button>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Orphan notes">
                    <div className="space-y-2">
                      {data.vault.orphanNoteIds.slice(0, 6).map((noteId) => {
                        const note = notesById.get(noteId);
                        if (!note) return null;
                        return (
                          <button key={noteId} onClick={() => setSelectedNoteId(noteId)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left text-sm text-white/75 transition hover:bg-white/10">
                            {note.title}
                          </button>
                        );
                      })}
                      {!data.vault.orphanNoteIds.length && <EmptyLine message="모든 노트가 task/project/link 중 하나 이상에 연결되어 있습니다." />}
                    </div>
                  </Panel>
                </div>

                {selectedNote ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <h3 className="text-3xl font-bold">{selectedNote.title}</h3>
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[selectedNote.type].tone)}>{noteTypeMeta[selectedNote.type].label}</span>
                    </div>
                    <p className="mb-4 text-sm text-white/45">{selectedNote.path} · {selectedNote.updatedAt}</p>
                    <p className="mb-6 text-white/75">{selectedNote.summary}</p>
                    <div className="mb-6 grid gap-4 text-sm text-white/75 md:grid-cols-3">
                      <InfoTile label="Project" value={selectedNote.project || "-"} />
                      <InfoTile label="Folder" value={selectedNote.folder} />
                      <InfoTile label="Tags" value={selectedNote.tags.length ? selectedNote.tags.join(", ") : "-"} />
                      <InfoTile label="Headings" value={selectedNote.headings.length ? selectedNote.headings.join(" · ") : "-"} />
                      <InfoTile label="Highlights" value={String(selectedNote.highlights.length)} />
                      <InfoTile label="Vault graph" value={`out ${vaultLinksByNoteId.get(selectedNote.id)?.linksTo.length || 0} · in ${vaultLinksByNoteId.get(selectedNote.id)?.linkedBy.length || 0}`} />
                    </div>
                    <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="mb-3 text-sm font-semibold text-white/55">핵심 포인트</p>
                      <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
                        {(selectedNote.highlights.length ? selectedNote.highlights : selectedNote.preview).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="mb-3 text-sm font-semibold text-white/55">Vault links</p>
                      <div className="grid gap-4 md:grid-cols-2 text-sm text-white/80">
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">Outgoing</p>
                          <div className="space-y-2">
                            {(vaultLinksByNoteId.get(selectedNote.id)?.linksTo || []).map((noteId) => {
                              const note = notesById.get(noteId);
                              return note ? <button key={noteId} onClick={() => setSelectedNoteId(noteId)} className="block w-full rounded-2xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{note.title}</button> : null;
                            })}
                            {!(vaultLinksByNoteId.get(selectedNote.id)?.linksTo || []).length && <EmptyLine message="연결된 outgoing note가 없습니다." />}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">Backlinks</p>
                          <div className="space-y-2">
                            {(vaultLinksByNoteId.get(selectedNote.id)?.linkedBy || []).map((noteId) => {
                              const note = notesById.get(noteId);
                              return note ? <button key={noteId} onClick={() => setSelectedNoteId(noteId)} className="block w-full rounded-2xl bg-white/5 px-3 py-2 text-left hover:bg-white/10">{note.title}</button> : null;
                            })}
                            {!(vaultLinksByNoteId.get(selectedNote.id)?.linkedBy || []).length && <EmptyLine message="아직 이 노트를 참조하는 backlink가 없습니다." />}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="mb-3 text-sm font-semibold text-white/55">원문 미리보기</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">{selectedNote.rawExcerpt}</pre>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="mb-3 text-sm font-semibold text-white/55">연결된 작업</p>
                      <div className="space-y-3">
                        {data.tasks.filter((task) => task.noteIds?.includes(selectedNote.id)).map((task) => (
                          <button key={task.id} onClick={() => setSection("tasks")} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
                            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{data.projects.find((project) => project.id === task.projectId)?.name || "-"}</p>
                            <strong>{task.title}</strong>
                            <p className="mt-2 text-sm text-white/70">{task.summary}</p>
                          </button>
                        ))}
                        {!data.tasks.some((task) => task.noteIds?.includes(selectedNote.id)) && <p className="text-sm text-white/55">아직 연결된 작업이 없습니다.</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="노트를 찾지 못했습니다" description={`notes export snapshot을 확인해 주세요. 현재 generated: ${data.dataSource.generatedAt || "미기록"} · root: ${data.dataSource.workspaceRoot || "미설정"} · note count: ${data.dataSource.notesCount}`} />
                )}
              </div>
            </div>
          )}

          {section === "releases" && (
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
                    <ChecklistRow item={{ id: 'release-1', label: '현재 작업 브랜치와 보호 브랜치 규칙 확인', status: releaseProjects.some((item) => !item.branchAligned) ? 'doing' : 'done', note: 'Portfolio는 develop만 사용, main touch 금지' }} />
                    <ChecklistRow item={{ id: 'release-2', label: '비로그인 public page smoke test', status: 'todo', note: 'build 후 route별 확인 필요' }} />
                    <ChecklistRow item={{ id: 'release-3', label: 'GitHub release / deploy 흔적 동기화', status: data.github.releases.length ? 'done' : 'doing', note: data.github.releases.length ? '최근 release cache 반영됨' : 'release가 없거나 아직 sync 전' }} />
                    <ChecklistRow item={{ id: 'release-4', label: '검증 대기 task 표시', status: summary.verifyingTasks ? 'doing' : 'todo', note: `${summary.verifyingTasks}개 task가 verifying 상태` }} />
                    <ChecklistRow item={{ id: 'release-5', label: 'Source health 확인', status: data.dataSource.sourceHealth.supabaseConfigured ? (data.dataSource.sourceHealth.supabaseReachable ? 'done' : 'blocked') : 'doing', note: `${data.dataSource.sourceHealth.activeMode} / preferred ${data.dataSource.sourceHealth.preferredMode}` }} />
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
                            <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', branchAligned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{branchAligned ? 'branch aligned' : 'branch mismatch'}</span>
                            <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', releases.length ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700')}>{releases.length ? `${releases.length} releases` : 'no releases'}</span>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <InfoTile label="Latest push" value={formatDateTime(repo?.pushedAt)} />
                          <InfoTile label="Days since push" value={daysSincePush != null ? String(daysSincePush) : '-'} />
                          <InfoTile label="Default / tracked" value={`${repo?.defaultBranch || '-'} / ${project.branch || '-'}`} />
                          <InfoTile label="Latest release" value={latestRelease ? `${latestRelease.tagName} · ${formatDateTime(latestRelease.publishedAt)}` : '없음'} />
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
          )}

          {section === "settings" && (
            <div className="space-y-8">
              <header>
                <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Settings</p>
                <h2 className="mb-3 text-4xl font-bold">운영 설정 / 연동 상태</h2>
                <p className="max-w-3xl text-white/70">애옹 보고 방식, 보호 브랜치 규칙, note source, GitHub sync 상태를 같이 보는 운영 설정 화면입니다.</p>
              </header>
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel title="운영 규칙 / spec">
                  <div className="space-y-3">
                    <ChecklistRow item={{ id: 'settings-1', label: '보고 템플릿: 3줄 요약 / 작업 설명 / 다음 액션', status: 'done' }} />
                    <ChecklistRow item={{ id: 'settings-2', label: 'Portfolio main 브랜치 직접 작업/머지 금지', status: 'done' }} />
                    <ChecklistRow item={{ id: 'settings-3', label: 'notes live/export fallback 유지', status: 'done', note: `source ${data.dataSource.mode}` }} />
                    <ChecklistRow item={{ id: 'settings-4', label: 'GitHub sync cache 자동 생성', status: data.github.mode === 'live' ? 'done' : 'doing', note: `generated ${formatDateTime(data.github.generatedAt)}` }} />
                    <ChecklistRow item={{ id: 'settings-5', label: 'Supabase real connection path visibility', status: data.dataSource.sourceHealth.supabaseConfigured ? (data.dataSource.sourceHealth.supabaseReachable ? 'done' : 'blocked') : 'doing', note: `${data.dataSource.sourceHealth.activeMode} / preferred ${data.dataSource.sourceHealth.preferredMode}` }} />
                    <ChecklistRow item={{ id: 'settings-6', label: '서버 기반 인증으로 전환', status: 'todo', note: '현재는 hardcoded access code MVP 보호' }} />
                  </div>
                </Panel>
                <div className="space-y-6">
                  <Panel title="Source metadata">
                    <div className="grid gap-4 text-sm text-white/75 md:grid-cols-2">
                      <InfoTile label="Workspace" value={data.dataSource.workspaceRoot || '미설정'} />
                      <InfoTile label="Notes count" value={String(data.dataSource.notesCount)} />
                      <InfoTile label="Notes roots" value={data.dataSource.notesRoots.join(' | ') || '-'} />
                      <InfoTile label="Notes synced at" value={data.dataSource.generatedAt || '미기록'} />
                      <InfoTile label="Vault folders" value={String(data.vault.folders.length)} />
                      <InfoTile label="Vault orphan notes" value={String(data.vault.orphanNoteIds.length)} />
                      <InfoTile label="GitHub account" value={data.github.account || 'unknown'} />
                      <InfoTile label="GitHub mode" value={`${data.github.mode} · repos ${data.github.repoSnapshots.length}`} />
                      <InfoTile label="Source active/preferred" value={`${data.dataSource.sourceHealth.activeMode} / ${data.dataSource.sourceHealth.preferredMode}`} />
                      <InfoTile label="Supabase" value={data.dataSource.sourceHealth.supabaseConfigured ? (data.dataSource.sourceHealth.supabaseReachable ? 'configured + reachable' : 'configured but unreachable') : 'not configured'} />
                      <InfoTile label="Last sync status" value={data.dataSource.sourceHealth.lastSyncStatus || '-'} />
                      <InfoTile label="Last sync at" value={formatDateTime(data.dataSource.sourceHealth.lastSyncAt)} />
                    </div>
                    {data.dataSource.sourceHealth.lastSyncMessage && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Source health note</p>
                        <p>{data.dataSource.sourceHealth.lastSyncMessage}</p>
                      </div>
                    )}
                  </Panel>
                  <Panel title="GitHub sync warnings">
                    <div className="space-y-3 text-sm text-white/80">
                      {(data.github.warnings || []).length ? (
                        data.github.warnings?.map((warning) => (
                          <div key={warning} className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-amber-50/90">{warning}</div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-emerald-50/90">경고 없음. 현재 read-only GitHub cache가 생성되어 있습니다.</div>
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <p className="mb-2 text-sm text-white/55">{label}</p>
      <strong className="text-3xl font-bold">{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <p className="mb-4 text-sm uppercase tracking-[0.2em] text-white/45">{title}</p>
      {children}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="break-all">{value}</p>
    </div>
  );
}

function TaskRow({ task, projectName, notesById, compact = false, repo }: { task: Task; projectName: string; notesById: Map<string, NoteItem>; compact?: boolean; repo?: GitHubRepoSnapshot; }) {
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

function SectorRow({ sector }: { sector: ProjectSectorProgress }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong>{sector.label}</strong>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", progressMeta[sector.status].tone)}>{progressMeta[sector.status].label}</span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-white/10">
        <div className={clsx("h-2 rounded-full", progressMeta[sector.status].bar, sector.status === 'todo' ? 'w-1/4' : sector.status === 'doing' ? 'w-2/3' : sector.status === 'blocked' ? 'w-1/3' : 'w-full')} />
      </div>
      <p className="text-sm text-white/70">{sector.summary}</p>
    </div>
  );
}

function ChecklistRow({ item }: { item: ProjectChecklistItem }) {
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

function GitHubRepoCard({ project, repo, onOpen }: { project: Project; repo?: GitHubRepoSnapshot; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="rounded-3xl border border-white/10 bg-black/20 p-5 text-left transition hover:bg-white/10">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{project.name}</p>
      <strong className="text-lg">{project.repo || 'repo 미연결'}</strong>
      <p className="mt-2 text-sm text-white/70">{repo?.description || project.summary}</p>
      <div className="mt-4 grid gap-2 text-xs text-white/55 md:grid-cols-2">
        <span>issues {repo?.openIssuesCount ?? 0}</span>
        <span>PRs {repo?.openPullRequestsCount ?? 0}</span>
        <span>branch {repo?.defaultBranch || project.branch || '-'}</span>
        <span>updated {formatDateTime(repo?.updatedAt)}</span>
      </div>
    </button>
  );
}

function GitHubRepoDetail({ repo }: { repo: GitHubRepoSnapshot }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <strong className="text-base">{repo.repo}</strong>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{repo.visibility}</span>
        {repo.primaryLanguage && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{repo.primaryLanguage}</span>}
      </div>
      <p className="mb-4 text-white/70">{repo.description || '설명 없음'}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoTile label="Default branch" value={repo.defaultBranch} />
        <InfoTile label="Open issues / PRs" value={`${repo.openIssuesCount ?? 0} / ${repo.openPullRequestsCount ?? 0}`} />
        <InfoTile label="Stars / Forks / Watchers" value={`${repo.stargazerCount ?? 0} / ${repo.forkCount ?? 0} / ${repo.watchersCount ?? 0}`} />
        <InfoTile label="Pushed at" value={formatDateTime(repo.pushedAt)} />
      </div>
      {!!repo.topics?.length && <p className="mt-3 text-xs text-white/50">topics: {repo.topics.join(' · ')}</p>}
    </div>
  );
}

function ProjectBoardCard({ board }: { board: GitHubProjectBoardSnapshot }) {
  return (
    <a href={board.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong>{board.title}</strong>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", board.closed ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700")}>{board.closed ? 'closed' : 'active'}</span>
      </div>
      <p className="text-sm text-white/70">{board.owner} · #{board.number} · items {board.itemCount ?? 0}</p>
      {!!board.fieldNames?.length && <p className="mt-2 text-xs text-white/50">fields: {board.fieldNames.slice(0, 6).join(' · ')}</p>}
    </a>
  );
}

function ReleaseCard({ release, compact = false }: { release: GitHubReleaseSnapshot; compact?: boolean }) {
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8">
      <h3 className="mb-2 text-2xl font-semibold">{title}</h3>
      <p className="text-white/70">{description}</p>
    </div>
  );
}

function EmptyLine({ message }: { message: string }) {
  return <p className="text-sm text-white/55">{message}</p>;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
