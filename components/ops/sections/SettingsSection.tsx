import { ChecklistRow, InfoTile, Panel } from "@/components/ops/shared";
import type { SettingsSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

export function SettingsSection({ data }: SettingsSectionProps) {
  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">
          Settings
        </p>
        <h2 className="mb-3 text-4xl font-bold">운영 설정 / 연동 상태</h2>
        <p className="max-w-3xl text-white/70">
          인증 보호, 읽기 source, 쓰기 fallback, GitHub cache, Supabase
          도달성까지 같이 보는 운영 설정 화면입니다.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="운영 규칙 / spec">
          <div className="space-y-3">
            <ChecklistRow
              item={{
                id: "settings-1",
                label: "보고 템플릿: 3줄 요약 / 작업 설명 / 다음 액션",
                status: "done",
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-2",
                label: "Portfolio main 브랜치 직접 작업/머지 금지",
                status: "done",
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-3",
                label: "Supabase-first notes path + direct workspace fallback",
                status: data.dataSource.mode === "supabase" ? "done" : "doing",
                note: `source ${data.dataSource.mode}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-4",
                label: "local JSON fallback 유지",
                status: "done",
                note: `active read source ${data.dataSource.mode}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-5",
                label: "GitHub sync cache 자동 생성",
                status: data.github.mode === "live" ? "done" : "doing",
                note: `generated ${formatDateTime(data.github.generatedAt)}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-6",
                label: "Supabase real connection path visibility",
                status: data.dataSource.sourceHealth.supabaseConfigured
                  ? data.dataSource.sourceHealth.supabaseReachable
                    ? "done"
                    : "blocked"
                  : "doing",
                note: `${data.dataSource.sourceHealth.activeMode} / preferred ${data.dataSource.sourceHealth.preferredMode}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-7",
                label: "Supabase 읽기 경로 가시화",
                status: data.dataSource.sourceHealth.supabaseConfigured
                  ? data.dataSource.sourceHealth.supabaseReachable
                    ? "done"
                    : "blocked"
                  : "doing",
                note: `${data.dataSource.sourceHealth.activeMode} / preferred ${data.dataSource.sourceHealth.preferredMode}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-8",
                label: "AI worklog + typed artifact sync path",
                status: data.artifacts.length ? "done" : "doing",
                note: `worklogs ${data.dataSource.sourceHealth.worklogsCount ?? data.worklogs.length} · artifacts ${data.dataSource.sourceHealth.artifactsCount ?? data.artifacts.length}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-9",
                label: "Direct assistant -> Supabase ingest path",
                status: data.dataSource.sourceHealth.supabaseReachable
                  ? "done"
                  : data.dataSource.sourceHealth.supabaseConfigured
                    ? "blocked"
                    : "doing",
                note: "`POST /api/ops/ingest` can write worklog + artifact rows without Mac mini watcher",
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-10",
                label: "Mac mini automation watcher status visibility",
                status:
                  data.dataSource.sourceHealth.automation?.mode &&
                  data.dataSource.sourceHealth.automation.mode !== "manual"
                    ? "done"
                    : "doing",
                note: `${data.dataSource.sourceHealth.automation?.mode || "manual"} / ${data.dataSource.sourceHealth.automation?.state || "manual"}`,
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-11",
                label: "기본 하드코드 access code를 production 필수 env로 승격",
                status: "done",
                note: "production에서 env 누락 시 auth 거부",
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-12",
                label: "same-origin mutation guard",
                status: "done",
                note: "auth / task / project / ingest write routes",
              }}
            />
            <ChecklistRow
              item={{
                id: "settings-13",
                label: "서버 기반 인증으로 전환",
                status: "todo",
                note: "현재는 hardcoded access code MVP 보호",
              }}
            />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Source metadata">
            <div className="grid gap-4 text-sm text-white/75 md:grid-cols-2">
              <InfoTile
                label="Workspace"
                value={data.dataSource.workspaceRoot || "미설정"}
              />
              <InfoTile label="Source mode" value={data.dataSource.mode} />
              <InfoTile
                label="Source active/preferred"
                value={`${data.dataSource.sourceHealth.activeMode} / ${data.dataSource.sourceHealth.preferredMode}`}
              />
              <InfoTile
                label="Write path"
                value={
                  data.dataSource.mode === "supabase"
                    ? "Supabase first + local mirror"
                    : "local fallback only"
                }
              />
              <InfoTile
                label="Supabase"
                value={
                  data.dataSource.sourceHealth.supabaseConfigured
                    ? data.dataSource.sourceHealth.supabaseReachable
                      ? "configured + reachable"
                      : "configured but unreachable"
                    : "not configured"
                }
              />
              <InfoTile
                label="Projects / Tasks / Notes"
                value={`${data.projects.length} / ${data.tasks.length} / ${data.dataSource.notesCount}`}
              />
              <InfoTile
                label="AI worklogs"
                value={`${data.dataSource.sourceHealth.worklogsCount ?? data.worklogs.length}`}
              />
              <InfoTile
                label="Typed artifacts"
                value={`${data.dataSource.sourceHealth.artifactsCount ?? data.artifacts.length}`}
              />
              <InfoTile
                label="Decisions / Learnings"
                value={`${data.dataSource.sourceHealth.decisionsCount ?? data.artifacts.filter((artifact) => artifact.artifactType === "decision").length} / ${data.dataSource.sourceHealth.learningsCount ?? data.artifacts.filter((artifact) => artifact.artifactType === "learning").length}`}
              />
              <InfoTile
                label="Artifacts updated at"
                value={formatDateTime(
                  data.dataSource.sourceHealth.artifactsUpdatedAt ||
                    data.artifacts[0]?.updatedAt ||
                    data.dataSource.sourceHealth.worklogsUpdatedAt ||
                    data.worklogs[0]?.updatedAt,
                )}
              />
              <InfoTile
                label="Notes synced at"
                value={formatDateTime(data.dataSource.generatedAt) || "미기록"}
              />
              <InfoTile
                label="Notes roots"
                value={data.dataSource.notesRoots.join(" | ") || "-"}
              />
              <InfoTile
                label="Resolved roots"
                value={
                  data.dataSource.resolvedRoots
                    .map((root) => `${root.label}: ${root.path}`)
                    .join(" | ") || "-"
                }
              />
              <InfoTile
                label="Vault folders"
                value={String(data.vault.folders.length)}
              />
              <InfoTile
                label="Vault orphan notes"
                value={String(data.vault.orphanNoteIds.length)}
              />
              <InfoTile
                label="GitHub account"
                value={data.github.account || "unknown"}
              />
              <InfoTile
                label="GitHub mode"
                value={`${data.github.mode} · repos ${data.github.repoSnapshots.length}`}
              />
              <InfoTile
                label="Last sync status"
                value={data.dataSource.sourceHealth.lastSyncStatus || "-"}
              />
              <InfoTile
                label="Last sync at"
                value={formatDateTime(data.dataSource.sourceHealth.lastSyncAt)}
              />
              <InfoTile
                label="Automation mode/state"
                value={`${data.dataSource.sourceHealth.automation?.mode || "manual"} / ${data.dataSource.sourceHealth.automation?.state || "manual"}`}
              />
              <InfoTile
                label="Automation heartbeat"
                value={formatDateTime(
                  data.dataSource.sourceHealth.automation?.heartbeatAt,
                )}
              />
              <InfoTile
                label="Automation PID"
                value={String(
                  data.dataSource.sourceHealth.automation?.pid || "-",
                )}
              />
              <InfoTile
                label="Automation last run"
                value={`${data.dataSource.sourceHealth.automation?.lastRunStatus || "-"} / ${formatDateTime(data.dataSource.sourceHealth.automation?.lastRunFinishedAt)}`}
              />
              <InfoTile
                label="Automation files"
                value={
                  [
                    data.dataSource.sourceHealth.automation?.statusPath,
                    data.dataSource.sourceHealth.automation?.logPath,
                    data.dataSource.sourceHealth.automation?.lockPath,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "-"
                }
              />
            </div>
            {(data.dataSource.sourceHealth.lastSyncMessage ||
              data.dataSource.sourceHealth.automation?.lastRunMessage ||
              data.dataSource.sourceHealth.automation?.nextSuggestedAction) && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                  Source health note
                </p>
                {data.dataSource.sourceHealth.lastSyncMessage && (
                  <p>{data.dataSource.sourceHealth.lastSyncMessage}</p>
                )}
                {data.dataSource.sourceHealth.automation?.lastRunMessage && (
                  <p className="mt-2">
                    automation:{" "}
                    {data.dataSource.sourceHealth.automation.lastRunMessage}
                  </p>
                )}
                {data.dataSource.sourceHealth.automation
                  ?.nextSuggestedAction && (
                  <p className="mt-2 text-white/60">
                    next:{" "}
                    {
                      data.dataSource.sourceHealth.automation
                        .nextSuggestedAction
                    }
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-50/90">
              <p className="font-semibold">현재 truth model</p>
              <p className="mt-2">
                로컬 Obsidian / JSON은 편집·fallback·백업 가치가 있고,
                Supabase는 활성 읽기 모드일 때 실제 `/ops` 렌더링 source가
                됩니다.
              </p>
              <p className="mt-1">
                그래서 Supabase가 reachable한 읽기 모드에서는 task / project /
                ingest note write를 DB-first로 반영하고, local fallback과
                workspace mirror도 같이 남겨 두 경로를 덜 어긋나게 유지합니다.
              </p>
            </div>
          </Panel>
          <Panel title="GitHub sync warnings">
            <div className="space-y-3 text-sm text-white/80">
              {(data.github.warnings || []).length ? (
                data.github.warnings?.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-amber-50/90"
                  >
                    {warning}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-emerald-50/90">
                  경고 없음. 현재 read-only GitHub cache가 생성되어 있습니다.
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
