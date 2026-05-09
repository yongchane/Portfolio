import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MacMiniPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;
  const latestHost = data?.hostStatuses[0];
  const latestWorker = data?.workerHeartbeats[0];

  return (
    <OpsRouteShell authenticated={authenticated} data={data} title="맥미니 관리" subtitle="Mac mini worker와 host 상태를 관리하는 페이지입니다.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/45">Host</p>
          <h3 className="text-2xl font-bold">{latestHost?.machine || "no signal"}</h3>
          <p className="mt-2 text-sm text-white/60">created {latestHost?.createdAt || "-"}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/45">Worker</p>
          <h3 className="text-2xl font-bold">{latestWorker?.status || "offline"}</h3>
          <p className="mt-2 text-sm text-white/60">last seen {latestWorker?.lastSeenAt || "-"}</p>
        </div>
      </div>
    </OpsRouteShell>
  );
}
