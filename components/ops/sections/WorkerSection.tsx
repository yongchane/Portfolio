import clsx from "clsx";
import { EmptyLine, InfoTile, Panel } from "@/components/ops/shared";
import type { WorkerSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

function isStale(timestamp?: string, thresholdMs = 90_000) {
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() > thresholdMs;
}

const statusTone = {
  online: "bg-emerald-100 text-emerald-700",
  offline: "bg-slate-100 text-slate-700",
  error: "bg-rose-100 text-rose-700",
  stale: "bg-amber-100 text-amber-700",
} as const;

export function WorkerSection({ data }: WorkerSectionProps) {
  const latestWorker = data.workerHeartbeats[0];
  const latestSync = data.syncRequests[0];
  const queued = data.syncRequests.filter((item) => item.status === "queued").length;
  const running = data.syncRequests.filter((item) => item.status === "running").length;
  const failed = data.syncRequests.filter((item) => item.status === "failed").length;
  const stale = isStale(latestWorker?.lastSeenAt);
  const effectiveStatus = stale ? "stale" : latestWorker?.status || "offline";

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Worker Status</p>
        <h2 className="mb-3 text-4xl font-bold">Mac mini worker 연결 상태</h2>
        <p className="max-w-3xl text-white/70">
          배포된 /ops는 Mac mini를 직접 읽지 않습니다. Mac mini worker가 Supabase에 push한 heartbeat, sync request, agent queue 상태를 기준으로 연결 상태를 판단합니다.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <InfoTile label="Worker" value={latestWorker?.workerName || "미연결"} />
        <InfoTile label="Status" value={effectiveStatus} />
        <InfoTile label="Queued / Running" value={`${queued} / ${running}`} />
        <InfoTile label="Failed" value={String(failed)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Latest heartbeat">
          {latestWorker ? (
            <article className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <strong className="text-white">{latestWorker.machine}</strong>
                  <p className="mt-1 text-xs text-white/45">{latestWorker.id} · {latestWorker.version || "version unknown"}</p>
                </div>
                <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", statusTone[effectiveStatus])}>{effectiveStatus}</span>
              </div>
              <p>last seen: {formatDateTime(latestWorker.lastSeenAt)}</p>
              <p className="mt-2 text-xs text-white/45">payload keys: {Object.keys(latestWorker.payload).join(", ") || "-"}</p>
            </article>
          ) : <EmptyLine message="아직 worker heartbeat가 없습니다. Mac mini에서 npm run ops:worker:once를 먼저 실행해야 합니다." />}
        </Panel>

        <Panel title="Recent sync requests">
          <div className="space-y-3">
            {data.syncRequests.slice(0, 8).map((request) => (
              <article key={request.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <strong className="text-white">{request.type}</strong>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{request.status}</span>
                </div>
                <p className="text-xs text-white/50">requested {formatDateTime(request.requestedAt)} · finished {formatDateTime(request.finishedAt)}</p>
                {request.error && <p className="mt-2 text-rose-200">{request.error}</p>}
              </article>
            ))}
            {!data.syncRequests.length && <EmptyLine message="아직 sync request가 없습니다." />}
          </div>
        </Panel>
      </div>

      <Panel title="Latest request detail">
        {latestSync ? (
          <pre className="overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-white/70">{JSON.stringify(latestSync.result, null, 2)}</pre>
        ) : <EmptyLine message="표시할 request 결과가 없습니다." />}
      </Panel>
    </div>
  );
}
