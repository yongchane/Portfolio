"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

type TaskStatus = "planned" | "doing" | "verifying" | "shipped" | "blocked";
type ProjectStage = "idea" | "planning" | "building" | "verifying" | "live";
type NoteType = "daily-chat-log" | "project-ops" | "aeyong-debug" | "weekly-review";

type Task = {
  id: string;
  title: string;
  projectId: string;
  category: "planning" | "build" | "deploy" | "ops" | "docs";
  status: TaskStatus;
  summary: string;
  completedWork: string[];
  nextActions: string[];
  relatedDocs?: string[];
  relatedCommits?: string[];
  noteIds?: string[];
  needsDecision?: string[];
  updatedAt: string;
};

type Project = {
  id: string;
  name: string;
  stage: ProjectStage;
  summary: string;
  repo?: string;
  branch?: string;
  deployUrl?: string;
  docs?: string[];
};

type NoteItem = {
  id: string;
  title: string;
  type: NoteType;
  project?: string;
  tags: string[];
  updatedAt: string;
  path: string;
  summary: string;
  highlights: string[];
};

const ACCESS_CODE = "hy-ops-0408";

const projects: Project[] = [
  {
    id: "tori-house",
    name: "Tori의 집",
    stage: "verifying",
    summary: "콘텐츠 운영을 direct DB publish 구조로 전환 중인 Tori public/admin 프로젝트",
    repo: "yongchane/tori-admin",
    branch: "master",
    deployUrl: "https://purrpurr-hub-public.vercel.app/",
    docs: ["Tori Harness", "MCP Plan"],
  },
  {
    id: "pawpong",
    name: "Pawpong",
    stage: "building",
    summary: "브리더 온보딩·상담·신뢰를 중심으로 재설계 중인 반려동물 플랫폼",
    repo: "Pawpong/pawpong_admin_frontend",
    branch: "main",
    docs: ["Pawpong Contest Harness", "Admin IA/AARRR"],
  },
  {
    id: "portfolio",
    name: "Portfolio 운영 콘솔",
    stage: "building",
    summary: "애옹 작업, 프로젝트 상태, 문서/릴리즈를 한곳에서 관리하기 위한 개인 운영 콘솔",
    repo: "yongchane/Portfolio",
    branch: "develop",
    docs: ["Obsidian for Aeyong Ops", "Ops Console UI Plan"],
  },
  {
    id: "openclaw",
    name: "OpenClaw 운영",
    stage: "live",
    summary: "role agent, harness docs, OAuth health check를 포함한 작업 운영 레이어",
    docs: ["Harness Engineering", "Async Registry", "OAuth Ops"],
  },
];

const notes: NoteItem[] = [
  {
    id: "note-daily-2026-04-10",
    title: "2026-04-10 Daily Chat Log",
    type: "daily-chat-log",
    project: "Portfolio",
    tags: ["ai-log", "portfolio", "ops-console"],
    updatedAt: "2026-04-10 23:15",
    path: "obsidian-vault/01 Daily Notes/2026-04-10.md",
    summary: "Portfolio /ops 콘솔 V2 논의, GitHub형 운영 콘솔 재설계, Obsidian vault 시작 결정을 정리한 일일 노트",
    highlights: [
      "초기 /ops MVP가 너무 얕았다는 문제 인식",
      "task-driven dashboard 구조로 재설계",
      "Obsidian은 workspace 내부 vault로 먼저 시작",
    ],
  },
  {
    id: "note-project-portfolio-ops",
    title: "Portfolio Ops Console",
    type: "project-ops",
    project: "Portfolio",
    tags: ["project-ops", "portfolio", "ops-console"],
    updatedAt: "2026-04-10 23:15",
    path: "obsidian-vault/02 Projects/Portfolio Ops Console.md",
    summary: "Portfolio 안에 현용찬 x 애옹 운영 콘솔을 만드는 프로젝트 노트",
    highlights: [
      "애옹 작업 관리 + 프로젝트 운영 + 문서/릴리즈/설정 통합",
      "JSON/GitHub/notes 연결 필요",
      "다음 단계는 notes link와 데이터 분리",
    ],
  },
  {
    id: "note-aeyong-collaboration",
    title: "Aeyong Collaboration Notes",
    type: "aeyong-debug",
    tags: ["aeyong", "collaboration"],
    updatedAt: "2026-04-10 23:15",
    path: "obsidian-vault/03 Aeyong/Aeyong Collaboration Notes.md",
    summary: "애옹 협업에서 중요한 규칙과 사용자의 기대치를 정리한 운영 노트",
    highlights: [
      "완료 보고보다 근거와 검증 중요",
      "verifying / shipped 분리 필요",
      "얕은 MVP보다 판단 가능한 정보 우선",
    ],
  },
  {
    id: "note-obsidian-plan",
    title: "Obsidian for Aeyong Ops",
    type: "project-ops",
    project: "Portfolio",
    tags: ["obsidian", "ops", "aeyong"],
    updatedAt: "2026-04-10 23:12",
    path: "docs/obsidian-for-aeyong-ops.md",
    summary: "Obsidian을 저장소로, /ops를 뷰어로 쓰는 방향의 구조 문서",
    highlights: [
      "workspace 안에 obsidian-vault 생성",
      "원문/요약/문제분석 3층 구조 권장",
      "나중에 notes UI와 연결 가능",
    ],
  },
];

const tasks: Task[] = [
  {
    id: "task-portfolio-console-v2",
    title: "Portfolio /ops 운영 콘솔 V2 설계 및 구현",
    projectId: "portfolio",
    category: "build",
    status: "doing",
    summary: "기존 상태판을 GitHub형 개인 운영 콘솔 구조로 확장",
    completedWork: [
      "develop 브랜치 생성",
      "초기 /ops MVP 추가",
      "Overview / Tasks / Projects / Docs / Releases / Settings IA 재설계",
    ],
    nextActions: [
      "프로젝트 상세 화면 추가",
      "JSON 데이터 분리",
      "GitHub 상태 반자동 연동",
    ],
    relatedCommits: ["d339ed6", "182dd78"],
    noteIds: ["note-daily-2026-04-10", "note-project-portfolio-ops"],
    needsDecision: ["데이터 저장 구조(JSON vs DB) 확정", "공개/비공개 노트 노출 범위 결정"],
    updatedAt: "2026-04-10 22:50",
  },
  {
    id: "task-aeyong-task-page",
    title: "애옹 작업 관리 페이지 기획 반영",
    projectId: "portfolio",
    category: "planning",
    status: "doing",
    summary: "작업 상태가 아니라 판단 가능한 실행 추적을 목표로 작업 구조를 재정의",
    completedWork: [
      "사용자 성향 기준으로 작업 관리 페이지 목적 재정의",
      "상태/증거/다음 액션/판단 필요 항목 구조화",
      "Obsidian notes를 작업 카드와 연결하는 방향 반영",
    ],
    nextActions: [
      "필터/정렬 UX 추가",
      "사용자 판단 필요 패널 강화",
      "작업 상세 화면 확장",
    ],
    relatedDocs: ["Aeyong task planning"],
    noteIds: ["note-aeyong-collaboration", "note-daily-2026-04-10"],
    needsDecision: ["작업 카드 정보 밀도 최종 조정"],
    updatedAt: "2026-04-10 23:18",
  },
  {
    id: "task-obsidian-ops",
    title: "Obsidian 기반 운영 기록 시스템 시작",
    projectId: "portfolio",
    category: "ops",
    status: "doing",
    summary: "Obsidian 앱 없이도 쓸 수 있는 markdown vault와 notes viewer 방향을 세팅",
    completedWork: [
      "workspace 내부 obsidian-vault 생성",
      "Daily / Project / Aeyong / Review 템플릿 생성",
      "초기 노트 3종 작성 및 notes viewer 방향 정의",
    ],
    nextActions: [
      "Notes 섹션 UI 강화",
      "md 파일 실연동 구조 추가",
      "대화 저장 정책 확정 후 자동 축적 시작",
    ],
    relatedDocs: ["Obsidian for Aeyong Ops"],
    noteIds: ["note-obsidian-plan", "note-daily-2026-04-10"],
    needsDecision: ["전체 대화 저장 vs 요약/문제 중심 저장 정책 결정"],
    updatedAt: "2026-04-10 23:15",
  },
  {
    id: "task-tori-direct-publish",
    title: "Tori direct DB publish 전환",
    projectId: "tori-house",
    category: "deploy",
    status: "verifying",
    summary: "게시 시 GitHub 경유 없이 DB와 public API를 통해 바로 반영되게 정리",
    completedWork: [
      "publish API를 direct DB publish로 변경",
      "published_at 반영",
      "worker cron 비활성화",
    ],
    nextActions: [
      "배포본에서 생성/게시/반영 최종 확인",
      "legacy worker 코드 정리",
      "운영 로그 화면 정리",
    ],
    relatedCommits: ["7f1e64d", "6d3b01c"],
    updatedAt: "2026-04-06 15:57",
  },
];

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

export default function AdminConsole() {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0].id);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0].id);

  const selectedProject = projects.find((item) => item.id === selectedProjectId) || projects[0];
  const projectTasks = tasks.filter((task) => task.projectId === selectedProject.id);
  const selectedNote = notes.find((item) => item.id === selectedNoteId) || notes[0];

  const summary = useMemo(() => ({
    totalProjects: projects.length,
    activeTasks: tasks.filter((task) => task.status === "doing").length,
    verifyingTasks: tasks.filter((task) => task.status === "verifying").length,
    notesCount: notes.length,
  }), []);

  const attentionTasks = tasks.filter((task) => task.status === "blocked" || task.status === "verifying" || (task.needsDecision?.length ?? 0) > 0).slice(0, 3);

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
                  section === item.id ? "bg-white text-black" : "bg-white/5 text-white/75 hover:bg-white/10"
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
                      <TaskRow key={task.id} task={task} projectName={projects.find((p) => p.id === task.projectId)?.name || "-"} compact />
                    ))}
                  </div>
                </Panel>
                <Panel title="최근 Obsidian 노트">
                  <div className="space-y-3">
                    {notes.slice(0, 3).map((note) => (
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
                <p className="text-white/70 max-w-3xl">상태 요약이 아니라, 실제 한 일 / 다음 액션 / 판단 필요 / Obsidian notes 근거까지 함께 보는 실행 추적 화면입니다.</p>
              </header>
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} projectName={projects.find((p) => p.id === task.projectId)?.name || "-"} />
                  ))}
                </div>
                <Panel title="왜 이 페이지가 중요한가">
                  <ul className="space-y-3 text-sm text-white/80 list-disc pl-4">
                    <li>애옹이 무슨 작업을 했는지 추적</li>
                    <li>완료와 검증을 분리해서 보기</li>
                    <li>문제/오해/판단 필요를 빠르게 찾기</li>
                    <li>작업을 Obsidian notes와 연결해 협업 자산으로 축적</li>
                  </ul>
                </Panel>
              </div>
            </div>
          )}

          {section === "projects" && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Projects</p>
                <h2 className="text-4xl font-bold mb-3">프로젝트 운영 관리</h2>
                <p className="text-white/70 max-w-3xl">기획 → 개발 → 배포 → 운영 흐름을 프로젝트 단위로 관리합니다.</p>
              </header>
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={clsx(
                        "w-full rounded-3xl border p-4 text-left transition",
                        selectedProject.id === project.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
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
                      <TaskRow key={task.id} task={task} projectName={selectedProject.name} compact />
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
                <h2 className="text-4xl font-bold mb-3">Obsidian Notes Viewer</h2>
                <p className="text-white/70 max-w-3xl">Obsidian 앱을 따로 열지 않아도 `/ops` 안에서 작업 기록과 대화 요약, 프로젝트 운영 노트를 탐색하는 공간입니다.</p>
              </header>
              <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <div className="space-y-3">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={clsx(
                        "w-full rounded-3xl border p-4 text-left transition",
                        selectedNote.id === note.id ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
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
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h3 className="text-3xl font-bold">{selectedNote.title}</h3>
                    <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", noteTypeMeta[selectedNote.type].tone)}>{noteTypeMeta[selectedNote.type].label}</span>
                  </div>
                  <p className="text-sm text-white/45 mb-4">{selectedNote.path} · {selectedNote.updatedAt}</p>
                  <p className="text-white/75 mb-6">{selectedNote.summary}</p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5 mb-6">
                    <p className="text-sm font-semibold text-white/55 mb-3">핵심 포인트</p>
                    <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
                      {selectedNote.highlights.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm font-semibold text-white/55 mb-3">왜 이 Notes 구조가 필요한가</p>
                    <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
                      <li>너와 애옹의 대화/작업/문제 분석을 자산화할 수 있음</li>
                      <li>작업 카드와 연결해 근거와 문맥을 같이 볼 수 있음</li>
                      <li>Obsidian 앱 없이도 포트폴리오 `/ops`에서 바로 열람 가능</li>
                    </ul>
                  </div>
                </div>
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
                "Obsidian vault 경로: workspace/obsidian-vault",
                "다음 단계: GitHub 연동 + notes 실제 파일 파싱",
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

function TaskRow({ task, projectName, compact = false }: { task: Task; projectName: string; compact?: boolean }) {
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
              <p>Notes: {task.noteIds?.length || 0}개 연결</p>
              <p>Decision: {task.needsDecision?.join(" / ") || "-"}</p>
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
