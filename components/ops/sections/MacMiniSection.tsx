import { EmptyLine, InfoTile, Panel } from "@/components/ops/shared";
import type { MacMiniSectionProps } from "@/components/ops/sections/types";
import { formatDateTime } from "@/components/ops/utils";

function formatBytes(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  const gb = value / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

export function MacMiniSection({ data }: MacMiniSectionProps) {
  const latestHost = data.hostStatuses[0];
  const latestOpenClaw = data.openclawStatuses[0];
  const memory = latestHost?.memory || {};
  const disk = latestHost?.disk || {};
  const cpu = latestHost?.cpu || {};

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/45">Mac mini Monitor</p>
        <h2 className="mb-3 text-4xl font-bold">맥미니 실시간 상태</h2>
        <p className="max-w-3xl text-white/70">
          kscold-control처럼 운영 상태를 보되, MVP에서는 Docker/Nginx 제어는 제외하고 worker가 Supabase에 push한 CPU/RAM/Disk/OpenClaw 상태만 봅니다.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <InfoTile label="Machine" value={latestHost?.machine || "미수집"} />
        <InfoTile label="CPU load" value={Array.isArray(cpu.loadAverage) ? cpu.loadAverage.map((item) => Number(item).toFixed(2)).join(" / ") : "-"} />
        <InfoTile label="Memory used" value={`${formatBytes(getNumber(memory, "used"))} / ${formatBytes(getNumber(memory, "total"))}`} />
        <InfoTile label="Uptime" value={latestHost?.uptimeSeconds ? `${Math.round(latestHost.uptimeSeconds / 3600)}h` : "-"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Host snapshot">
          {latestHost ? (
            <div className="space-y-3 text-sm text-white/75">
              <InfoTile label="Disk" value={`${disk.capacity || "-"} used · ${formatBytes(getNumber(disk, "availableKb") ? getNumber(disk, "availableKb")! * 1024 : undefined)} available`} />
              <InfoTile label="Collected" value={formatDateTime(latestHost.createdAt)} />
              <pre className="overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-white/60">{JSON.stringify({ cpu, memory, disk, network: latestHost.network }, null, 2)}</pre>
            </div>
          ) : <EmptyLine message="아직 host status가 없습니다. Mac mini worker 실행 후 표시됩니다." />}
        </Panel>

        <Panel title="OpenClaw pushed status">
          {latestOpenClaw ? (
            <div className="space-y-3 text-sm text-white/75">
              <InfoTile label="Gateway" value={latestOpenClaw.gatewayStatus} />
              <InfoTile label="Collected" value={formatDateTime(latestOpenClaw.createdAt)} />
              <pre className="overflow-auto rounded-2xl bg-black/30 p-4 text-xs text-white/60">{JSON.stringify({ model: latestOpenClaw.model, cron: latestOpenClaw.cron, issues: latestOpenClaw.issues }, null, 2)}</pre>
            </div>
          ) : <EmptyLine message="아직 OpenClaw pushed status가 없습니다. 배포 서버 직접 진단값이 아니라 Mac mini worker push 값을 기다립니다." />}
        </Panel>
      </div>
    </div>
  );
}
