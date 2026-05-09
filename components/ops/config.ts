import type { NoteType, ProgressState, ProjectStage, TaskStatus } from "@/lib/ops/types";

export const taskStatusMeta: Record<TaskStatus, { label: string; tone: string }> = {
  planned: { label: "예정", tone: "bg-slate-100 text-slate-700" },
  doing: { label: "진행 중", tone: "bg-amber-100 text-amber-700" },
  verifying: { label: "검증 중", tone: "bg-sky-100 text-sky-700" },
  shipped: { label: "완료", tone: "bg-emerald-100 text-emerald-700" },
  blocked: { label: "막힘", tone: "bg-rose-100 text-rose-700" },
};

export const projectStageMeta: Record<ProjectStage, { label: string; tone: string }> = {
  idea: { label: "아이디어", tone: "bg-slate-100 text-slate-700" },
  planning: { label: "기획", tone: "bg-fuchsia-100 text-fuchsia-700" },
  building: { label: "개발 중", tone: "bg-amber-100 text-amber-700" },
  verifying: { label: "검증 중", tone: "bg-sky-100 text-sky-700" },
  live: { label: "운영 중", tone: "bg-emerald-100 text-emerald-700" },
};

export const noteTypeMeta: Record<NoteType, { label: string; tone: string }> = {
  "daily-chat-log": { label: "Daily Log", tone: "bg-sky-100 text-sky-700" },
  "project-ops": { label: "Project Note", tone: "bg-fuchsia-100 text-fuchsia-700" },
  "aeyong-debug": { label: "Aeyong Note", tone: "bg-amber-100 text-amber-700" },
  "weekly-review": { label: "Review", tone: "bg-emerald-100 text-emerald-700" },
  reference: { label: "Docs", tone: "bg-violet-100 text-violet-700" },
};

export const progressMeta: Record<ProgressState, { label: string; tone: string; bar: string }> = {
  todo: { label: "대기", tone: "bg-slate-100 text-slate-700", bar: "bg-slate-500" },
  doing: { label: "진행 중", tone: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  done: { label: "완료", tone: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
  blocked: { label: "막힘", tone: "bg-rose-100 text-rose-700", bar: "bg-rose-400" },
};

export const sidebarItems = [
  { id: "overview", label: "홈", icon: "⌂", group: "Home" },
  { id: "projects", label: "프로젝트 관리", icon: "◆", group: "Design" },
  { id: "macmini", label: "맥미니 관리", icon: "◉", group: "System" },
  { id: "openclaw", label: "오픈클로 관리", icon: "✦", group: "AI Ops" },
  { id: "notes", label: "옵시디언 문서", icon: "▣", group: "Docs" },
] as const;

export type SidebarSectionId = (typeof sidebarItems)[number]["id"];
export type SectionId = SidebarSectionId | "tasks" | "aeyong" | "worker" | "releases" | "settings";
