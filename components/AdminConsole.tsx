"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { NoteItem, OpsConsoleData, ProjectStage, Task, TaskStatus, NoteType } from "@/lib/ops/types";

const ACCESS_CODE = "hy-ops-0408";

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

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "projects", label: "Projects" },
  { id: "notes", label: "Notes" },
  { id: "releases", label: "Releases" },
  { id: "settings", label: "Settings" },
] as const;

type SectionId = (typeof sidebarItems)[number]["id"];

export default function AdminConsole({ data }: { data: OpsConsoleData }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(data.projects[0]?.id ?? "");
  const [selectedNoteId, setSelectedNoteId] = useState<string>(data.notes[0]?.id ?? "");
  const [noteQuery, setNoteQuery] = useState("");

  const selectedProject = data.projects.find((item) => item.id === selectedProjectId) || data.projects[0];
  const projectTasks = data.tasks.filter((task) => task.projectId === selectedProject?.id);

  const filteredNotes = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    if (!query) return data.notes;

    return data.notes.filter((note) => {
      const haystack = [
        note.title,
        note.summary,
        note.path,
        note.project,
        note.tags.join(" "),
        note.headings.join(" "),
        note.rawExcerpt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [data.notes, noteQuery]);

  const selectedNote = filteredNotes.find((item) => item.id === selectedNoteId) || filteredNotes[0] || data.notes[0];

  useEffect(() => {
    if (!filteredNotes.length) return;
    if (!filteredNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId]);

  const notesById = useMemo(() => new Map(data.notes.map((note) => [note.id, note])), [data.notes]);
  const summary = useMemo(
    () => ({
      totalProjects: data.projects.length,
      activeTasks: data.tasks.filter((task) => task.status === "doing").length,
      verifyingTasks: data.tasks.filter((task) => task.status === "verifying").length,
      notesCount: data.notes.length,
    }),
    [data.projects.length, data.tasks, data.notes.length],
  );

  const attentionTasks = data.tasks
    .filter((task) => task.status === "blocked" || task.status === "verifying" || (task.needsDecision?.length ?? 0) > 0)
    .slice(0, 3);

  if (!unlocked) {
    return (
      <section className="min-h-screen bg-[#0b1020] text-white px-6 py-24">
        <div className="max-w-xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.24em] text-white/50 mb-3">Private Ops Console</p>
          <h1 className="text-3xl font-bold mb-3">운영 콘솔 접근</h1>
          <p className="text-white/70 mb-6">개인 관리자 페이지입니다. 접근 코드를 입력해 주세요.</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="access code"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />
          <button
            onClick={() => setUnlocked(input === ACCESS_CODE)}
            className="mt-4 w-full rounded-2xl bg-white text-black px-4 py-3 font-semibold"
          >
            입장하기
          </button>
          <p className="mt-3 text-xs text-white/40">임시 MVP 보호 방식입니다. 실제 운영 시에는 서버 기반 인증으로 교체 권장.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#0b1020] text-white">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-white/10 bg-black/20 p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-white/40 mb-3">Aeyong OS</p>
          <h1 className="text-2xl font-bold mb-8">현용찬 운영 콘솔</h1>
          <nav className="space-y-2 mb-8">
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white/60 mb-3">운영 원칙</p>
            <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
              <li>결론 먼저 보고</li>
              <li>main 브랜치는 명시 허락 전 금지</li>
              <li>완료와 검증을 분리</li>
              <li>작업 카드에 근거/다음 액션/판단 필요를 같이 둔다</li>
            </ul>
          </div>
        </aside>

        <main className="p-6 lg:p-10">
          {section === "overview" && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Overview</p>
                <h2 className="text-4xl font-bold mb-3">오늘의 운영 상황</h2>
                <p className="text-white/70 max-w-3xl">애옹 작업, 프로젝트 상태, Obsidian notes, 사용자 판단 필요 항목을 한 번에 보는 홈 화면입니다.</p>
              </header>
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard label="전체 프로젝트" value={String(summary.totalProjects)} />
                <SummaryCard label="진행 중 작업" value={String(summary.activeTasks)} />
                <SummaryCard label="검증 중 작업" value={String(summary.verifyingTasks)} />
                <SummaryCard label="저장된 노트" value={String(summary.notesCount)} />
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Panel title="사용자 판단 필요">
                  <div className="space-y-4">
                    {attentionTasks.map((task) => (
                      <TaskRow key={task.id} task={task} projectName={data.projects.find((p) => p.id === task.projectId)?.name || "-"} notesById={notesById} compact />
                    ))}
                  </div>
                </Panel>
                <Panel title="최근 워크스페이스 노트">
                  <div className="space-y-3">
                    {data.notes.slice(0, 4).map((note) => (
                      <button key={note.id} onClick={() => { setSelectedNoteId(note.id); setSection("notes"); }} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/10 transition">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <strong>{note.title}</strong>
                          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[note.type].tone)}>{noteTypeMeta[note.type].label}</span>
                        </div>
                        <p className="text-sm text-white/70 mb-2">{note.summary}</p>
                        <p className="text-xs text-white/45">{note.path}</p>
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {section === "tasks" && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Tasks</p>
                <h2 className="text-4xl font-bold mb-3">애옹 작업 관리</h2>
                <p className="text-white/70 max-w-3xl">상태 요약이 아니라, 실제 한 일 / 다음 액션 / 판단 필요 / 노트 근거까지 함께 보는 실행 추적 화면입니다.</p>
              </header>
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  {data.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} projectName={data.projects.find((p) => p.id === task.projectId)?.name || "-"} notesById={notesById} />
                  ))}
                </div>
                <Panel title="왜 이 페이지가 중요한가">
                  <ul className="space-y-3 text-sm text-white/80 list-disc pl-4">
                    <li>애옹이 무슨 작업을 했는지 추적</li>
                    <li>완료와 검증을 분리해서 보기</li>
                    <li>문제/오해/판단 필요를 빠르게 찾기</li>
                    <li>작업을 워크스페이스 노트와 연결해 협업 자산으로 축적</li>
                  </ul>
                </Panel>
              </div>
            </div>
          )}

          {section === "projects" && selectedProject && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Projects</p>
                <h2 className="text-4xl font-bold mb-3">프로젝트 운영 관리</h2>
                <p className="text-white/70 max-w-3xl">기획 → 개발 → 배포 → 운영 흐름을 프로젝트 단위로 관리합니다.</p>
              </header>
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
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
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <strong className="text-lg">{project.name}</strong>
                        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", projectStageMeta[project.stage].tone)}>{projectStageMeta[project.stage].label}</span>
                      </div>
                      <p className="text-sm text-white/70">{project.summary}</p>
                    </button>
                  ))}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-3xl font-bold">{selectedProject.name}</h3>
                      <p className="text-white/70 mt-2 max-w-3xl">{selectedProject.summary}</p>
                    </div>
                    <span className={clsx("rounded-full px-3 py-1 text-sm font-semibold", projectStageMeta[selectedProject.stage].tone)}>{projectStageMeta[selectedProject.stage].label}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 mb-6 text-sm text-white/75">
                    <InfoTile label="Repository" value={selectedProject.repo || "-"} />
                    <InfoTile label="Branch" value={selectedProject.branch || "-"} />
                    <InfoTile label="Deploy" value={selectedProject.deployUrl || "-"} />
                    <InfoTile label="Docs" value={selectedProject.docs?.join(", ") || "-"} />
                  </div>
                  <div className="space-y-4">
                    {projectTasks.map((task) => (
                      <TaskRow key={task.id} task={task} projectName={selectedProject.name} notesById={notesById} compact />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === "notes" && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Notes</p>
                <h2 className="text-4xl font-bold mb-3">Workspace Notes Viewer</h2>
                <p className="text-white/70 max-w-3xl">Obsidian 앱을 따로 열지 않아도 `/ops` 안에서 작업 기록과 대화 요약, 프로젝트 운영 문서를 실제 markdown 파일 기준으로 탐색합니다.</p>
              </header>
              <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <label className="block text-xs uppercase tracking-[0.2em] text-white/45 mb-2">노트 검색</label>
                    <input
                      value={noteQuery}
                      onChange={(event) => setNoteQuery(event.target.value)}
                      placeholder="제목, 태그, 경로, 내용 검색"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                    />
                    <p className="mt-2 text-xs text-white/45">{filteredNotes.length} / {data.notes.length}개 노트 표시 · root {data.dataSource.workspaceRoot || "미탐지"}</p>
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
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <strong>{note.title}</strong>
                        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[note.type].tone)}>{noteTypeMeta[note.type].label}</span>
                      </div>
                      <p className="text-sm text-white/70 mb-2">{note.summary}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {note.tags.map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">#{tag}</span>)}
                      </div>
                      <p className="text-xs text-white/45">{note.path}</p>
                    </button>
                  ))}

                  {!filteredNotes.length && (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">
                      검색 조건에 맞는 노트가 없습니다. 다른 키워드를 시도해 주세요.
                    </div>
                  )}
                </div>
                </div>

                {selectedNote ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h3 className="text-3xl font-bold">{selectedNote.title}</h3>
                      <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[selectedNote.type].tone)}>{noteTypeMeta[selectedNote.type].label}</span>
                    </div>
                    <p className="text-sm text-white/45 mb-4">{selectedNote.path} · {selectedNote.updatedAt}</p>
                    <p className="text-white/75 mb-6">{selectedNote.summary}</p>
                    <div className="grid gap-4 md:grid-cols-2 mb-6 text-sm text-white/75">
                      <InfoTile label="Project" value={selectedNote.project || "-"} />
                      <InfoTile label="Tags" value={selectedNote.tags.length ? selectedNote.tags.join(", ") : "-"} />
                      <InfoTile label="Headings" value={selectedNote.headings.length ? selectedNote.headings.join(" · ") : "-"} />
                      <InfoTile label="Highlights" value={String(selectedNote.highlights.length)} />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-6">
                      <p className="text-sm font-semibold text-white/55 mb-3">핵심 포인트</p>
                      <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
                        {(selectedNote.highlights.length ? selectedNote.highlights : selectedNote.preview).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-6">
                      <p className="text-sm font-semibold text-white/55 mb-3">원문 미리보기</p>
                      <pre className="whitespace-pre-wrap text-sm text-white/80 font-sans leading-7">{selectedNote.rawExcerpt}</pre>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-sm font-semibold text-white/55 mb-3">연결된 작업</p>
                      <div className="space-y-3">
                        {data.tasks.filter((task) => task.noteIds?.includes(selectedNote.id)).map((task) => (
                          <button key={task.id} onClick={() => setSection("tasks")} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition">
                            <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-2">{data.projects.find((project) => project.id === task.projectId)?.name || "-"}</p>
                            <strong>{task.title}</strong>
                            <p className="text-sm text-white/70 mt-2">{task.summary}</p>
                          </button>
                        ))}
                        {!data.tasks.some((task) => task.noteIds?.includes(selectedNote.id)) && <p className="text-sm text-white/55">아직 연결된 작업이 없습니다.</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="노트를 찾지 못했습니다"
                    description={`워크스페이스 루트 또는 markdown note scan 결과를 확인해 주세요. 현재 root: ${data.dataSource.workspaceRoot || "미탐지"} · note count: ${data.dataSource.notesCount} · attempted: ${data.dataSource.attemptedWorkspaceRoots.join(" | ") || "없음"}`}
                  />
                )}
              </div>
            </div>
          )}

          {section === "releases" && (
            <SimpleSection
              title="Releases"
              description="프로젝트별 배포 상태, 브랜치, 검증 여부를 보는 릴리즈 관제 공간"
              bullets={[
                "프로젝트별 deploy URL",
                "현재 작업 브랜치와 최근 커밋",
                "비로그인 public 200 검증 여부",
                "배포 후 검증 대기 작업 표시",
              ]}
            />
          )}

          {section === "settings" && (
            <SimpleSection
              title="Settings"
              description="애옹 보고 방식, 보호 브랜치 규칙, 연동 상태, 운영 규칙을 관리하는 공간"
              bullets={[
                "보고 템플릿: 3줄 요약 / 작업 간단 설명 / 앞으로 해야할 작업",
                "Portfolio main 브랜치 직접 작업/머지 금지",
                `워크스페이스 루트: ${data.dataSource.workspaceRoot || "미탐지"}`,
                `노트 개수: ${data.dataSource.notesCount}개`,
                `노트 스캔 루트: ${data.dataSource.notesRoots.join(" | ")}`,
                `탐색한 workspace 후보: ${data.dataSource.attemptedWorkspaceRoots.slice(0, 4).join(" | ")}${data.dataSource.attemptedWorkspaceRoots.length > 4 ? " ..." : ""}`,
              ]}
            />
          )}
        </main>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <p className="text-sm text-white/55 mb-2">{label}</p>
      <strong className="text-3xl font-bold">{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <p className="text-sm uppercase tracking-[0.2em] text-white/45 mb-4">{title}</p>
      {children}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-2">{label}</p>
      <p className="break-all">{value}</p>
    </div>
  );
}

function TaskRow({ task, projectName, notesById, compact = false }: { task: Task; projectName: string; notesById: Map<string, NoteItem>; compact?: boolean }) {
  const linkedNotes = (task.noteIds || []).map((noteId) => notesById.get(noteId)).filter((note): note is NoteItem => Boolean(note));

  return (
    <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45 mb-2">{projectName} · {task.category}</p>
          <h3 className={clsx(compact ? "text-xl" : "text-2xl", "font-semibold")}>{task.title}</h3>
          <p className="text-white/70 mt-2 text-sm">{task.summary}</p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", taskStatusMeta[task.status].tone)}>{taskStatusMeta[task.status].label}</span>
          <span className="text-xs text-white/45">{task.updatedAt}</span>
        </div>
      </div>
      <div className={clsx("grid gap-4", compact ? "md:grid-cols-2" : "md:grid-cols-[1fr_1fr_0.9fr]")}>
        <div>
          <p className="text-sm font-semibold text-white/55 mb-2">완료된 작업</p>
          <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
            {task.completedWork.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white/55 mb-2">다음 액션</p>
          <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
            {task.nextActions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        {!compact && (
          <div>
            <p className="text-sm font-semibold text-white/55 mb-2">판단 / 근거</p>
            <div className="space-y-2 text-sm text-white/75">
              <p>Docs: {task.relatedDocs?.join(", ") || "-"}</p>
              <p>Commits: {task.relatedCommits?.join(", ") || "-"}</p>
              <p>Linked notes: {linkedNotes.length || 0}개</p>
              <p>Decision: {task.needsDecision?.join(" / ") || "-"}</p>
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

function SimpleSection({ title, description, bullets }: { title: string; description: string; bullets: string[] }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">{title}</p>
        <h2 className="text-4xl font-bold mb-3">{title}</h2>
        <p className="text-white/70 max-w-3xl">{description}</p>
      </header>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <ul className="space-y-3 text-white/80 list-disc pl-4">
          {bullets.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8">
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-white/70">{description}</p>
    </div>
  );
}
