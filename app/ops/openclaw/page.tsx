import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpenClawPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;
  const latestStatus = data?.openclawStatuses[0];

  return (
    <OpsRouteShell authenticated={authenticated} data={data} title="오픈클로 관리" subtitle="OpenClaw gateway, agent, session 상태를 관리할 페이지입니다.">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">Gateway</p>
          <strong className="mt-2 block text-2xl">{latestStatus?.gatewayStatus || data?.openclaw.health.score || "-"}</strong>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">Configured agents</p>
          <strong className="mt-2 block text-2xl">{data?.openclaw.model.configuredAgents.length ?? 0}</strong>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">Agent runs</p>
          <strong className="mt-2 block text-2xl">{data?.agentRuns.length ?? 0}</strong>
        </div>
      </div>
    </OpsRouteShell>
  );
}
