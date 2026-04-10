"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

type ProjectStatus = "building" | "verifying" | "deployed" | "blocked";

type ProjectItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  summary: string;
  recentWork: string[];
  nextActions: string[];
  deployedUrl?: string;
  docs?: { title: string; url: string }[];
};

const projects: ProjectItem[] = [
  {
    id: "tori-house",
    name: "Tori의 집",
    status: "verifying",
    summary: "Admin direct DB publish → public API 조회 구조로 전환 중인 콘텐츠 운영 프로젝트",
    recentWork: [
      "Admin publish를 direct DB publish 기준으로 정리",
      "public site가 Supabase/API에서 게시글 직접 조회하도록 전환",
      "운영 로그를 admin_events 중심으로 재정리"
    ],
    nextActions: [
      "배포본에서 생성/게시/반영 최종 확인",
      "legacy worker 경로 정리",
      "MCP/tool surface 연결"
    ],
    deployedUrl: "https://purrpurr-hub-public.vercel.app/",
    docs: [
      { title: "Tori Harness Operations", url: "/docs/tori-harness-operations" },
      { title: "Tori MCP Plan", url: "/docs/tori-architecture-mcp-plan" }
    ]
  },
  {
    id: "pawpong",
    name: "Pawpong",
    status: "building",
    summary: "브리더 온보딩·상담·신뢰를 중심으로 재설계 중인 반려동물 플랫폼",
    recentWork: [
      "포퐁 리뉴얼 사이트 기준 어드민 IA/AARRR/플로우 재설계",
      "콘테스트 사진 꾸미기 MVP 프로토타입 추가",
      "알림톡 템플릿 검수 대응 문구 구조 정리"
    ],
    nextActions: [
      "어드민 UX/IA를 task-first 구조로 구체화",
      "필터/꾸미기 기능 실제 백엔드 연결",
      "브리더 심사/상담 운영 콘솔 설계 고도화"
    ]
  },
  {
    id: "portfolio-console",
    name: "Portfolio 운영 콘솔",
    status: "building",
    summary: "프로젝트별 상태, 최근 작업, 다음 액션을 시각화하는 개인 운영 대시보드",
    recentWork: [
      "develop 브랜치 생성 완료",
      "관리자 페이지/프로젝트 트래킹 구조 설계 시작",
      "개인 전용 운영 콘솔 방향 확정"
    ],
    nextActions: [
      "관리자 페이지 UI 1차 완성",
      "프로젝트 데이터 소스 구조화",
      "접근 보호 방식 보강"
    ]
  },
  {
    id: "openclaw-ops",
    name: "OpenClaw 운영",
    status: "deployed",
    summary: "role agent, harness docs, OAuth health check 등 운영 안정화 작업 진행",
    recentWork: [
      "Harness Engineering Baseline 문서/규칙 반영",
      "OAuth healthcheck cron 추가",
      "async work registry 및 role contract 정리"
    ],
    nextActions: [
      "Notion integration 표준 경로 정리",
      "OAuth 취약 경로 추가 점검",
      "운영 보고 체계 더 단순화"
    ]
  }
];

const statusMeta: Record<ProjectStatus, { label: string; tone: string }> = {
  building: { label: "작업 중", tone: "bg-amber-100 text-amber-700" },
  verifying: { label: "검증 중", tone: "bg-sky-100 text-sky-700" },
  deployed: { label: "운영 중", tone: "bg-emerald-100 text-emerald-700" },
  blocked: { label: "막힘", tone: "bg-rose-100 text-rose-700" }
};

const ACCESS_CODE = "hy-ops-0408";

export default function AdminConsole() {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const summary = useMemo(() => {
    return {
      total: projects.length,
      building: projects.filter((p) => p.status === "building").length,
      verifying: projects.filter((p) => p.status === "verifying").length,
      deployed: projects.filter((p) => p.status === "deployed").length,
      blocked: projects.filter((p) => p.status === "blocked").length,
    };
  }, []);

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
          <p className="mt-3 text-xs text-white/40">임시 MVP 보호 방식입니다. 실제 운영 시에는 서버 기반 인증으로 교체하는 것을 권장합니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#0b1020] text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.24em] text-white/50 mb-3">Aeyong Ops</p>
          <h1 className="text-4xl font-bold mb-3">프로젝트 운영 콘솔</h1>
          <p className="text-white/70 max-w-3xl">프로젝트 상태, 최근 작업, 다음 액션, 운영 문서 방향을 한눈에 보는 개인용 관리자 페이지 MVP입니다.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-10">
          <SummaryCard label="전체 프로젝트" value={String(summary.total)} />
          <SummaryCard label="작업 중" value={String(summary.building)} />
          <SummaryCard label="검증 중" value={String(summary.verifying)} />
          <SummaryCard label="운영 중" value={String(summary.deployed)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            {projects.map((project) => (
              <article key={project.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{project.name}</h2>
                    <p className="text-white/65 mt-2 max-w-3xl">{project.summary}</p>
                  </div>
                  <span className={clsx("inline-flex h-fit rounded-full px-3 py-1 text-sm font-semibold", statusMeta[project.status].tone)}>
                    {statusMeta[project.status].label}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-black/20 p-4 border border-white/5">
                    <p className="text-sm font-semibold text-white/60 mb-3">최근 작업</p>
                    <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
                      {project.recentWork.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-black/20 p-4 border border-white/5">
                    <p className="text-sm font-semibold text-white/60 mb-3">다음 액션</p>
                    <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
                      {project.nextActions.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                {(project.deployedUrl || project.docs?.length) && (
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {project.deployedUrl && <a href={project.deployedUrl} target="_blank" className="rounded-full border border-white/10 px-3 py-2 text-white/80 hover:bg-white/10">배포 링크</a>}
                    {project.docs?.map((doc) => <span key={doc.title} className="rounded-full border border-white/10 px-3 py-2 text-white/55">{doc.title}</span>)}
                  </div>
                )}
              </article>
            ))}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <p className="text-sm font-semibold text-white/60 mb-3">현재 운영 원칙</p>
              <ul className="space-y-2 text-sm text-white/80 list-disc pl-4">
                <li>설명보다 결론 먼저 보고</li>
                <li>프로젝트별 상태와 다음 액션 분리</li>
                <li>main 브랜치는 명시 허락 전 작업 금지</li>
                <li>하네스 엔지니어링 기준으로 문서/검증/비동기 관리</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <p className="text-sm font-semibold text-white/60 mb-3">오늘의 우선순위</p>
              <ol className="space-y-2 text-sm text-white/80 list-decimal pl-4">
                <li>Portfolio 운영 콘솔 완성</li>
                <li>Tori 배포본 최종 검증</li>
                <li>Pawpong 어드민/콘테스트 운영 구조 구체화</li>
              </ol>
            </div>
          </aside>
        </div>
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
