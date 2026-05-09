"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AccessGate } from "@/components/ops/auth/AccessGate";
import { AeyongSection } from "@/components/ops/sections/AeyongSection";
import { sidebarItems, type SectionId } from "@/components/ops/config";
import { MacMiniSection } from "@/components/ops/sections/MacMiniSection";
import { NotesSection } from "@/components/ops/sections/NotesSection";
import { OverviewSection } from "@/components/ops/sections/OverviewSection";
import { ProjectsSection } from "@/components/ops/sections/ProjectsSection";
import { ReleasesSection } from "@/components/ops/sections/ReleasesSection";
import { SettingsSection } from "@/components/ops/sections/SettingsSection";
import { TasksSection } from "@/components/ops/sections/TasksSection";
import { WorkerSection } from "@/components/ops/sections/WorkerSection";
import { CmsMetricPill, Panel, VisualDivider } from "@/components/ops/shared";
import {
  buildOpsSummary,
  createGithubReposByName,
  createNotesById,
  createProjectBoardsByOwner,
  createVaultLinksByNoteId,
  filterNotes,
  getAttentionTasks,
  getProjectBoardsForRepo,
  getProjectExecutionStatus,
  getProjectLinkedNotesCount,
  getProjectNextActions,
  getProjectReleases,
  getProjectRepoHealth,
  getProjectTasks,
  getReleaseProjects,
  getSelectedProject,
  getSelectedProjectNotes,
  getSelectedRepo,
} from "@/lib/ops/selectors";
import type { OpsConsoleData, OpsVersionSnapshot } from "@/lib/ops/types";
import { buildOpsVersionSnapshot } from "@/lib/ops/version";

const STALE_MINUTES = 10;

function isFreshTimestamp(value?: string) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= STALE_MINUTES * 60 * 1000;
}

export default function OpsConsole({ authenticated, data }: { authenticated: boolean; data: OpsConsoleData | null }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(data?.projects[0]?.id ?? "");
  const [selectedNoteId, setSelectedNoteId] = useState<string>(data?.notes[0]?.id ?? "");
  const [noteQuery, setNoteQuery] = useState("");
  const [liveStatus, setLiveStatus] = useState<OpsVersionSnapshot | null>(null);
  const lastSeenSignature = useRef(data ? buildOpsVersionSnapshot(data).signature : "");

  const safeData = data ?? null;
  const notesById = useMemo(() => createNotesById(safeData?.notes || []), [safeData?.notes]);
  const githubReposByName = useMemo(() => (safeData ? createGithubReposByName(safeData) : new Map()), [safeData]);
  const projectBoardsByOwner = useMemo(() => (safeData ? createProjectBoardsByOwner(safeData) : new Map()), [safeData]);
  const filteredNotes = useMemo(() => filterNotes(safeData?.notes || [], noteQuery), [safeData?.notes, noteQuery]);
  const selectedNote = filteredNotes.find((item) => item.id === selectedNoteId) || filteredNotes[0] || safeData?.notes[0];
  const summary = useMemo(() => (safeData ? buildOpsSummary(safeData) : null), [safeData]);
  const attentionTasks = useMemo(() => getAttentionTasks(safeData?.tasks || []), [safeData?.tasks]);
  const selectedProject = safeData ? getSelectedProject(safeData, selectedProjectId) : undefined;
  const projectTasks = useMemo(() => getProjectTasks(safeData?.tasks || [], selectedProject?.id), [safeData?.tasks, selectedProject?.id]);
  const selectedRepo = useMemo(() => getSelectedRepo(selectedProject, githubReposByName), [selectedProject, githubReposByName]);
  const selectedProjectBoards = useMemo(() => getProjectBoardsForRepo(selectedRepo, projectBoardsByOwner), [selectedRepo, projectBoardsByOwner]);
  const selectedProjectReleases = useMemo(() => (safeData ? getProjectReleases(safeData, selectedRepo?.repo) : []), [safeData, selectedRepo?.repo]);
  const selectedProjectNotes = useMemo(() => getSelectedProjectNotes(safeData?.notes || [], selectedProject), [safeData?.notes, selectedProject]);
  const selectedProjectNotesCount = useMemo(() => getProjectLinkedNotesCount(safeData?.notes || [], selectedProject), [safeData?.notes, selectedProject]);
  const selectedProjectNextActions = useMemo(() => getProjectNextActions(projectTasks), [projectTasks]);
  const projectExecutionStatus = useMemo(() => getProjectExecutionStatus(projectTasks), [projectTasks]);
  const vaultLinksByNoteId = useMemo(() => (safeData ? createVaultLinksByNoteId(safeData) : new Map()), [safeData]);
  const projectRepoHealth = useMemo(() => getProjectRepoHealth(selectedProject, selectedRepo, selectedProjectReleases), [selectedProject, selectedRepo, selectedProjectReleases]);
  const releaseProjects = useMemo(() => (safeData ? getReleaseProjects(safeData, githubReposByName) : []), [safeData, githubReposByName]);
  const latestWorker = safeData?.workerHeartbeats[0];
  const workerFresh = isFreshTimestamp(latestWorker?.lastSeenAt);
  const workerLabel = latestWorker ? (latestWorker.status === "online" && !workerFresh ? "stale" : latestWorker.status) : "offline";

  useEffect(() => {
    if (!filteredNotes.length) return;
    if (!filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  useEffect(() => {
    if (!data) return;
    const snapshot = buildOpsVersionSnapshot(data);
    lastSeenSignature.current = snapshot.signature;
    setLiveStatus(snapshot);
  }, [data]);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/ops/notes-version", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as OpsVersionSnapshot;
        if (cancelled) return;
        setLiveStatus(payload);
        if (payload.signature && payload.signature !== lastSeenSignature.current) {
          lastSeenSignature.current = payload.signature;
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

  if (!authenticated || !safeData || !summary) {
    return <AccessGate input={input} setInput={setInput} isSubmitting={isSubmitting} authError={authError} onSubmit={handleUnlock} />;
  }

  return (
    <section className="min-h-screen bg-[#070b16] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_45%_82%,rgba(16,185,129,0.10),transparent_34%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-white/10 bg-black/25 p-6 backdrop-blur-xl">
          <div className="mb-6 rounded-[1.75rem] border border-cyan-300/15 bg-cyan-400/10 p-4 shadow-2xl shadow-cyan-500/10">
            <p className="mb-2 text-xs uppercase tracking-[0.28em] text-cyan-100/55">Aeyong OS</p>
            <h1 className="text-2xl font-bold">현용찬 운영 콘솔</h1>
            <p className="mt-2 text-xs leading-5 text-white/55">CMS처럼 관리하고, 시냅스처럼 연결 관계를 보는 개인 운영 지도.</p>
          </div>
          <nav className="mb-6 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={clsx(
                  "group relative w-full overflow-hidden rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                  section === item.id ? "border-white/35 bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.18)]" : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/10",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={clsx("grid h-8 w-8 place-items-center rounded-xl text-xs", section === item.id ? "bg-black text-white" : "bg-white/10 text-white/70")}>{item.icon}</span>
                  <span>
                    <span className="block">{item.label}</span>
                    <span className={clsx("text-[10px] uppercase tracking-[0.18em]", section === item.id ? "text-black/45" : "text-white/35")}>{item.group}</span>
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <VisualDivider />

          <div className="my-5 grid grid-cols-2 gap-2">
            <CmsMetricPill label="Projects" value={String(safeData.projects.length)} tone="cyan" />
            <CmsMetricPill label="Tasks" value={String(safeData.tasks.length)} tone="amber" />
            <CmsMetricPill label="Docs" value={String(safeData.notes.length)} tone="violet" />
            <CmsMetricPill label="Runs" value={String(safeData.agentRuns.length)} tone="emerald" />
          </div>

          <Panel title="운영 원칙">
            <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
              <li>결론 먼저 보고</li>
              <li>main 브랜치는 명시 허락 전 금지</li>
              <li>완료와 검증을 분리</li>
              <li>작업 카드에 근거/다음 액션/판단 필요를 같이 둔다</li>
            </ul>
          </Panel>

          <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-200/70">Ops data source</p>
            <p className="text-sm text-white/85">
              mode: <strong>{liveStatus?.mode || safeData.dataSource.mode}</strong> · preferred <strong>{safeData.dataSource.sourceHealth.preferredMode}</strong>
            </p>
            <p className="mt-1 text-xs text-white/55">
              notes {liveStatus?.notesCount ?? safeData.dataSource.notesCount}개 · tasks {liveStatus?.tasksCount ?? safeData.tasks.length} · worklogs {safeData.dataSource.sourceHealth.worklogsCount ?? safeData.worklogs.length} · artifacts {safeData.dataSource.sourceHealth.artifactsCount ?? safeData.artifacts.length}
            </p>
            <p className="mt-1 text-xs text-white/55">
              sync {safeData.dataSource.sourceHealth.lastSyncStatus || "-"} · updated {liveStatus?.generatedAt || safeData.dataSource.generatedAt}
            </p>
            <p className="mt-2 text-xs text-white/50">/ops가 source mode / sync state / row count 변화를 함께 감지해서 화면을 자동 refresh합니다.</p>
          </div>

          <div className="mt-4 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-violet-100/70">GitHub Sync</p>
            <p className="text-sm text-white/85">
              {safeData.github.mode === "live" ? "read-only live cache" : "fallback cache"} · {safeData.github.account || "unknown"}
            </p>
            <p className="mt-1 text-xs text-white/55">repos {safeData.github.repoSnapshots.length} · boards {safeData.github.projectBoards.length} · releases {safeData.github.releases.length}</p>
            <p className="mt-2 text-xs text-white/50">generated {safeData.github.generatedAt}</p>
          </div>
        </aside>

        <main className="relative p-6 lg:p-10">
          <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">CMS Command Surface</p>
                <h2 className="mt-2 text-2xl font-bold">{sidebarItems.find((item) => item.id === section)?.label || "Overview"}</h2>
                <p className="mt-1 text-sm text-white/55">오늘 처리할 액션을 먼저 보고, 상태/문서/GitHub 신호는 근거로 확인합니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <CmsMetricPill label="Worker" value={workerLabel} tone={workerLabel === "online" ? "emerald" : "amber"} />
                <CmsMetricPill label="Mac" value={safeData.hostStatuses[0]?.machine || "no signal"} tone="cyan" />
                <CmsMetricPill label="Source" value={safeData.dataSource.mode} tone="slate" />
                <CmsMetricPill label="GitHub" value={String(safeData.github.repoSnapshots.length)} tone="violet" />
              </div>
            </div>
          </div>
          {section === "overview" && <OverviewSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} attentionTasks={attentionTasks} liveStatus={liveStatus} />}
          {section === "aeyong" && <AeyongSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
          {section === "worker" && <WorkerSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
          {section === "macmini" && <MacMiniSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
          {section === "tasks" && <TasksSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
          {section === "projects" && selectedProject && <ProjectsSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} selectedProject={selectedProject} projectTasks={projectTasks} selectedRepo={selectedRepo} selectedProjectBoards={selectedProjectBoards} selectedProjectReleases={selectedProjectReleases} selectedProjectNotes={selectedProjectNotes} selectedProjectNotesCount={selectedProjectNotesCount} selectedProjectNextActions={selectedProjectNextActions} projectExecutionStatus={projectExecutionStatus} projectRepoHealth={projectRepoHealth} vaultLinksByNoteId={vaultLinksByNoteId} />}
          {section === "notes" && <NotesSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} filteredNotes={filteredNotes} selectedNote={selectedNote} selectedNoteId={selectedNoteId} noteQuery={noteQuery} setNoteQuery={setNoteQuery} vaultLinksByNoteId={vaultLinksByNoteId} />}
          {section === "releases" && <ReleasesSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} releaseProjects={releaseProjects} />}
          {section === "settings" && <SettingsSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
        </main>
      </div>
    </section>
  );
}
