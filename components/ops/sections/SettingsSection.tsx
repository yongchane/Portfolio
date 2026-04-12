import { ChecklistRow, InfoTile, Panel } from "@/components/ops/shared";
import type { SettingsSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

export function SettingsSection({ data }: SettingsSectionProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Settings</p>
        <h2 className="mb-3 text-4xl font-bold">운영 설정 / 연동 상태</h2>
        <p className="max-w-3xl text-white/70">애옹 보고 방식, 보호 브랜치 규칙, note source, GitHub sync 상태를 같이 보는 운영 설정 화면입니다.</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="운영 규칙 / spec">
          <div className="space-y-3">
            <ChecklistRow item={{ id: "settings-1", label: "보고 템플릿: 3줄 요약 / 작업 설명 / 다음 액션", status: "done" }} />
            <ChecklistRow item={{ id: "settings-2", label: "Portfolio main 브랜치 직접 작업/머지 금지", status: "done" }} />
            <ChecklistRow item={{ id: "settings-3", label: "notes live/export fallback 유지", status: "done", note: `source ${data.dataSource.mode}` }} />
            <ChecklistRow item={{ id: "settings-4", label: "GitHub sync cache 자동 생성", status: data.github.mode === "live" ? "done" : "doing", note: `generated ${formatDateTime(data.github.generatedAt)}` }} />
            <ChecklistRow item={{ id: "settings-5", label: "Supabase real connection path visibility", status: data.dataSource.sourceHealth.supabaseConfigured ? (data.dataSource.sourceHealth.supabaseReachable ? "done" : "blocked") : "doing", note: `${data.dataSource.sourceHealth.activeMode} / preferred ${data.dataSource.sourceHealth.preferredMode}` }} />
            <ChecklistRow item={{ id: "settings-6", label: "서버 기반 인증으로 전환", status: "todo", note: "현재는 hardcoded access code MVP 보호" }} />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Source metadata">
            <div className="grid gap-4 text-sm text-white/75 md:grid-cols-2">
              <InfoTile label="Workspace" value={data.dataSource.workspaceRoot || "미설정"} />
              <InfoTile label="Source mode" value={data.dataSource.mode} />
              <InfoTile label="Source active/preferred" value={`${data.dataSource.sourceHealth.activeMode} / ${data.dataSource.sourceHealth.preferredMode}`} />
              <InfoTile label="Supabase" value={data.dataSource.sourceHealth.supabaseConfigured ? (data.dataSource.sourceHealth.supabaseReachable ? "configured + reachable" : "configured but unreachable") : "not configured"} />
              <InfoTile label="Projects / Tasks / Notes" value={`${data.projects.length} / ${data.tasks.length} / ${data.dataSource.notesCount}`} />
              <InfoTile label="Notes synced at" value={formatDateTime(data.dataSource.generatedAt) || "미기록"} />
              <InfoTile label="Notes roots" value={data.dataSource.notesRoots.join(" | ") || "-"} />
              <InfoTile label="Resolved roots" value={data.dataSource.resolvedRoots.map((root) => `${root.label}: ${root.path}`).join(" | ") || "-"} />
              <InfoTile label="Vault folders" value={String(data.vault.folders.length)} />
              <InfoTile label="Vault orphan notes" value={String(data.vault.orphanNoteIds.length)} />
              <InfoTile label="GitHub account" value={data.github.account || "unknown"} />
              <InfoTile label="GitHub mode" value={`${data.github.mode} · repos ${data.github.repoSnapshots.length}`} />
              <InfoTile label="Last sync status" value={data.dataSource.sourceHealth.lastSyncStatus || "-"} />
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
  );
}
