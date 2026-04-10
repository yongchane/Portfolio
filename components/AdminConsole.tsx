"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

type TaskStatus = "planned" | "doing" | "verifying" | "shipped" | "blocked";
type ProjectStage = "idea" | "planning" | "building" | "verifying" | "live";

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
    docs: ["Tori Harness", "MCP Plan"]
  },
  {
    id: "pawpong",
    name: "Pawpong",
    stage: "building",
    summary: "브리더 온보딩·상담·신뢰를 중심으로 재설계 중인 반려동물 플랫폼",
    repo: "Pawpong/pawpong_admin_frontend",
    branch: "main",
    docs: ["Pawpong Contest Harness", "Admin IA/AARRR"]
  },
  {
    id: "portfolio",
    name: "Portfolio 운영 콘솔",
    stage: "building",
    summary: "애옹 작업, 프로젝트 상태, 문서/릴리즈를 한곳에서 관리하기 위한 개인 운영 콘솔",
    repo: "yongchane/Portfolio",
    branch: "develop"
  },
  {
    id: "openclaw",
    name: "OpenClaw 운영",
    stage: "live",
    summary: "role agent, harness docs, OAuth health check를 포함한 작업 운영 레이어",
    docs: ["Harness Engineering", "Async Registry", "OAuth Ops"]
  }
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
      "Overview / Tasks / Projects / Docs / Releases / Settings IA 재설계"
    ],
    nextActions: [
      "프로젝트 상세 화면 추가",
      "JSON 데이터 분리",
      "GitHub 상태 반자동 연동"
    ],
    relatedCommits: ["d339ed6"],
    updatedAt: "2026-04-10 22:45"
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
      "worker cron 비활성화"
    ],
    nextActions: [
      "배포본에서 생성/게시/반영 최종 확인",
      "legacy worker 코드 정리",
      "운영 로그 화면 정리"
    ],
    relatedCommits: ["7f1e64d", "6d3b01c"],
    updatedAt: "2026-04-06 15:57"
  },
  {
    id: "task-pawpong-admin-redesign",
    title: "Pawpong 어드민 리뉴얼 IA/AARRR/플로우 재설계",
    projectId: "pawpong",
    category: "planning",
    status: "doing",
    summary: "기존 기능 나열형 어드민을 운영자 중심 task-first 구조로 재정의",
    completedWork: [
      "운영 중인 어드민 레포 분석",
      "새 IA/AARRR/플로우 설계",
      "Notion 문서 초안 작성"
    ],
    nextActions: [
      "화면별 와이어프레임 설계",
      "어드민 핵심 메뉴 MVP 정의",
      "프로토타입과 실제 어드민 연결 전략 수립"
    ],
    updatedAt: "2026-04-10 20:40"
  },
  {
    id: "task-openclaw-harness",
    title: "OpenClaw 하네스 엔지니어링 강화",
    projectId: "openclaw",
    category: "ops",
    status: "shipped",
    summary: "요청 라우팅, 상태 머신, done criteria, role contract를 문서와 규칙으로 반영",
    completedWork: [
      "Harness Engineering Baseline 문서화",
      "AGENTS에 운영 베이스라인 반영",
      "OAuth healthcheck cron 추가"
    ],
    nextActions: [
      "Notion integration 표준화",
      "role agent 운영 고도화",
      "GitHub/배포 상태와 연결"
    ],
    updatedAt: "2026-04-10 15:04"
  }
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

const sidebarItems = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "projects", label: "Projects" },
  { id: "docs", label: "Docs" },
  { id: "releases", label: "Releases" },
  { id: "settings", label: "Settings" },
] as const;

type SectionId = (typeof sidebarItems)[number]["id"];

export default function AdminConsole() {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0].id);

  const selectedProject = projects.find((item) => item.id === selectedProjectId) || projects[0];
  const projectTasks = tasks.filter((task) => task.projectId === selectedProject.id);

  const summary = useMemo(() => ({
    totalProjects: projects.length,
    activeTasks: tasks.filter((task) => task.status === "doing").length,
    verifyingTasks: tasks.filter((task) => task.status === "verifying").length,
    shippedThisWeek: tasks.filter((task) => task.status === "shipped").length,
  }), []);

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
              <li>프로젝트별 상태/다음 액션 분리</li>
              <li>하네스 기준으로 작업/검증/비동기 운영</li>
            </ul>
          </div>
        </aside>

        <main className="p-6 lg:p-10">
          {section === "overview" && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Overview</p>
                <h2 className="text-4xl font-bold mb-3">오늘의 운영 상황</h2>
                <p className="text-white/70 max-w-3xl">애옹 작업, 프로젝트 상태, 최근 완료 사항과 다음 우선순위를 한 번에 보는 홈 화면입니다.</p>
              </header>
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard label="전체 프로젝트" value={String(summary.totalProjects)} />
                <SummaryCard label="진행 중 작업" value={String(summary.activeTasks)} />
                <SummaryCard label="검증 중 작업" value={String(summary.verifyingTasks)} />
                <SummaryCard label="완료된 작업" value={String(summary.shippedThisWeek)} />
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
                <Panel title="최근 작업">
                  <div className="space-y-4">
                    {tasks.slice(0, 4).map((task) => (
                      <TaskRow key={task.id} task={task} projectName={projects.find((p) => p.id === task.projectId)?.name || "-"} compact />
                    ))}
                  </div>
                </Panel>
                <Panel title="오늘의 우선순위">
                  <ol className="space-y-3 text-sm text-white/80 list-decimal pl-4">
                    <li>Portfolio 운영 콘솔 V2 구조 다듬기</li>
                    <li>Pawpong 어드민 IA → 실제 화면 와이어프레임화</li>
                    <li>Tori 배포본 최종 반영 상태 재확인</li>
                  </ol>
                </Panel>
              </div>
            </div>
          )}

          {section === "tasks" && (
            <div className="space-y-8">
              <header>
                <p className="text-sm uppercase tracking-[0.24em] text-white/45 mb-3">Tasks</p>
                <h2 className="text-4xl font-bold mb-3">애옹 작업 관리</h2>
                <p className="text-white/70 max-w-3xl">프로젝트를 넘나드는 실제 작업 단위를 상태/최근 작업/다음 액션 기준으로 추적합니다.</p>
              </header>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} projectName={projects.find((p) => p.id === task.projectId)?.name || "-"} />
                ))}
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

          {section === "docs" && (
            <SimpleSection
              title="Docs"
              description="기획 문서, IA, AARRR, 운영 플로우, 회고 문서를 프로젝트별로 관리하는 공간"
              bullets={[
                "포퐁 어드민 IA / AARRR / 운영 플로우",
                "Tori Harness / MCP / 운영 문서",
                "OpenClaw Harness / Async Registry / OAuth Ops",
                "프로젝트별 회고/릴리즈 문서 연결 예정"
              ]}
            />
          )}

          {section === "releases" && (
            <SimpleSection
              title="Releases"
              description="프로젝트별 배포 상태, 브랜치, 검증 여부를 보는 릴리즈 관제 공간"
              bullets={[
                "프로젝트별 deploy URL",
                "현재 작업 브랜치와 최근 커밋",
                "비로그인 public 200 검증 여부",
                "배포 후 검증 대기 작업 표시"
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
                "Notion integration 정리 필요 (Macmini vs openclaw)",
                "OAuth healthcheck 및 하네스 운영 규칙 유지"
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
      <div className={clsx("grid gap-4", compact ? "md:grid-cols-2" : "md:grid-cols-[1fr_1fr_0.8fr]")}>
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
            <p className="text-sm font-semibold text-white/55 mb-2">연결 정보</p>
            <div className="space-y-2 text-sm text-white/75">
              <p>Docs: {task.relatedDocs?.join(", ") || "-"}</p>
              <p>Commits: {task.relatedCommits?.join(", ") || "-"}</p>
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
