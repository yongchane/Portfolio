"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AccessGate } from "@/components/ops/auth/AccessGate";
import { sidebarItems, type SectionId } from "@/components/ops/config";
import { NotesSection } from "@/components/ops/sections/NotesSection";
import { OverviewSection } from "@/components/ops/sections/OverviewSection";
import { ProjectsSection } from "@/components/ops/sections/ProjectsSection";
import { ReleasesSection } from "@/components/ops/sections/ReleasesSection";
import { SettingsSection } from "@/components/ops/sections/SettingsSection";
import { TasksSection } from "@/components/ops/sections/TasksSection";
import { Panel } from "@/components/ops/shared";
import {
  buildOpsSummary,
  createGithubReposByName,
  createNotesById,
  createProjectBoardsByOwner,
  createVaultLinksByNoteId,
  filterNotes,
  getAttentionTasks,
  getProjectBoardsForRepo,
  getProjectReleases,
  getProjectRepoHealth,
  getProjectTasks,
  getReleaseProjects,
  getSelectedProject,
  getSelectedProjectNotes,
  getSelectedRepo,
} from "@/lib/ops/selectors";
import type { OpsConsoleData } from "@/lib/ops/types";

export default function OpsConsole({ authenticated, data }: { authenticated: boolean; data: OpsConsoleData | null }) {
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
  const vaultLinksByNoteId = useMemo(() => (safeData ? createVaultLinksByNoteId(safeData) : new Map()), [safeData]);
  const projectRepoHealth = useMemo(() => getProjectRepoHealth(selectedProject, selectedRepo, selectedProjectReleases), [selectedProject, selectedRepo, selectedProjectReleases]);
  const releaseProjects = useMemo(() => (safeData ? getReleaseProjects(safeData, githubReposByName) : []), [safeData, githubReposByName]);

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

  if (!authenticated || !safeData || !summary) {
    return <AccessGate input={input} setInput={setInput} isSubmitting={isSubmitting} authError={authError} onSubmit={handleUnlock} />;
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
              mode: <strong>{liveStatus?.mode || safeData.dataSource.mode}</strong>
            </p>
            <p className="mt-1 text-xs text-white/55">notes {liveStatus?.notesCount ?? safeData.dataSource.notesCount}개 · updated {liveStatus?.generatedAt || safeData.dataSource.generatedAt}</p>
            <p className="mt-2 text-xs text-white/50">/ops가 주기적으로 source 변경을 확인하고, 노트가 바뀌면 화면을 자동 refresh합니다.</p>
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

        <main className="p-6 lg:p-10">
          {section === "overview" && <OverviewSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} attentionTasks={attentionTasks} liveStatus={liveStatus} />}
          {section === "tasks" && <TasksSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
          {section === "projects" && selectedProject && <ProjectsSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} selectedProject={selectedProject} projectTasks={projectTasks} selectedRepo={selectedRepo} selectedProjectBoards={selectedProjectBoards} selectedProjectReleases={selectedProjectReleases} selectedProjectNotes={selectedProjectNotes} projectRepoHealth={projectRepoHealth} vaultLinksByNoteId={vaultLinksByNoteId} />}
          {section === "notes" && <NotesSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} filteredNotes={filteredNotes} selectedNote={selectedNote} selectedNoteId={selectedNoteId} noteQuery={noteQuery} setNoteQuery={setNoteQuery} vaultLinksByNoteId={vaultLinksByNoteId} />}
          {section === "releases" && <ReleasesSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} releaseProjects={releaseProjects} />}
          {section === "settings" && <SettingsSection data={safeData} summary={summary} notesById={notesById} githubReposByName={githubReposByName} setSection={setSection} setSelectedProjectId={setSelectedProjectId} setSelectedNoteId={setSelectedNoteId} />}
        </main>
      </div>
    </section>
  );
}
