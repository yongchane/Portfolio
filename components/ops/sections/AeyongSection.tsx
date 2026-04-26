import clsx from "clsx";
import { ChecklistRow, InfoTile, Panel } from "@/components/ops/shared";
import type { AeyongSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

const severityTone = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-sky-100 text-sky-700",
} as const;

export function AeyongSection({ data }: AeyongSectionProps) {
  const { openclaw } = data;

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Aeyong Control</p>
        <h2 className="mb-3 text-4xl font-bold">애옹 설정 / 문제 진단 / 작업 제어</h2>
        <p className="max-w-3xl text-white/70">
          OpenClaw 설정, 메모리/옵시디언 운영 파일, 작업 히스토리, 자동화 상태를 한 곳에서 읽어
          내가 어떻게 설정되어 있고 어디가 어긋나는지 확인하는 관리 화면입니다.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <InfoTile label="Health score" value={`${openclaw.health.score}/100`} />
        <InfoTile label="Current model" value={openclaw.model.primary || "unknown"} />
        <InfoTile label="GPT-5.5 configured" value={openclaw.model.gpt55Configured ? "yes" : "no"} />
        <InfoTile label="Generated" value={formatDateTime(openclaw.generatedAt)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Assistant operating contract">
          <div className="space-y-3">
            <ChecklistRow item={{ id: "contract-checklist", label: "요청마다 체크리스트 먼저 만들기", status: openclaw.preferences.checklistFirst ? "done" : "blocked", note: openclaw.preferences.checklistFirst ? "memory/daily preference에서 감지됨" : "장기/일일 메모리에서 명확히 감지되지 않음" }} />
            <ChecklistRow item={{ id: "contract-report", label: "완료 시 간결한 키워드 보고", status: openclaw.preferences.conciseKeywordReport ? "done" : "doing", note: openclaw.preferences.conciseKeywordReport ? "키워드/간결 보고 선호 감지" : "보고 포맷 메모 강화 필요" }} />
            <ChecklistRow item={{ id: "contract-model", label: "강한 기본 모델 유지", status: openclaw.model.gpt55Configured ? "done" : "blocked", note: openclaw.model.primary || "primary model unknown" }} />
            <ChecklistRow item={{ id: "contract-history", label: "옵시디언/메모리 기반 히스토리 추적", status: data.notes.length || data.worklogs.length ? "done" : "doing", note: `notes ${data.notes.length} · worklogs ${data.worklogs.length}` }} />
            <ChecklistRow item={{ id: "contract-ingest", label: "작업 결과 direct ingest API 연결", status: data.dataSource.sourceHealth.supabaseReachable || data.worklogs.length ? "done" : "doing", note: "POST /api/ops/ingest + local/Supabase mirror path" }} />
          </div>
        </Panel>

        <Panel title="Detected issues / recommendations">
          <div className="space-y-3">
            {openclaw.issues.map((issue) => (
              <article key={issue.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <strong className="text-white">{issue.title}</strong>
                  <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", severityTone[issue.severity])}>{issue.severity}</span>
                </div>
                <p>{issue.detail}</p>
                <p className="mt-2 text-xs text-white/50">추천: {issue.recommendation}</p>
              </article>
            ))}
            {!openclaw.issues.length && <p className="text-sm text-white/55">현재 감지된 설정 문제는 없습니다.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="OpenClaw files via Obsidian/workspace">
          <div className="space-y-3">
            {openclaw.files.map((file) => (
              <article key={file.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-white">{file.label}</strong>
                  <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", file.exists ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{file.exists ? "linked" : "missing"}</span>
                </div>
                <p className="break-all text-xs text-white/45">{file.path}</p>
                <p className="mt-2">{file.summary || "-"}</p>
                <p className="mt-2 text-xs text-white/50">lines {file.lineCount ?? "-"} · bytes {file.bytes ?? "-"} · updated {formatDateTime(file.updatedAt)}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Recent assistant/project work">
          <div className="space-y-3">
            {data.worklogs.slice(0, 6).map((worklog) => (
              <article key={worklog.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <strong className="text-white">{worklog.title}</strong>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{worklog.status}</span>
                </div>
                <p>{worklog.summary}</p>
                <p className="mt-2 text-xs text-white/50">{worklog.actor} · {worklog.project || worklog.repo || "unassigned"} · {formatDateTime(worklog.updatedAt)}</p>
              </article>
            ))}
            {!data.worklogs.length && <p className="text-sm text-white/55">아직 표시할 작업 로그가 없습니다.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
