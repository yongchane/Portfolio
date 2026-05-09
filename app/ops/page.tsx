import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Ops Console",
  robots: { index: false, follow: false },
};

export default async function OpsPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;

  return (
    <OpsRouteShell authenticated={authenticated} data={data} title="홈" subtitle="라우팅 기반 /ops 홈입니다.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">관리 프로젝트</p>
          <strong className="mt-2 block text-4xl">{data?.projects.length ?? 0}</strong>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">GitHub repos</p>
          <strong className="mt-2 block text-4xl">{data?.github.repoSnapshots.length ?? 0}</strong>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">문서</p>
          <strong className="mt-2 block text-4xl">{data?.notes.length ?? 0}</strong>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/55">Agent runs</p>
          <strong className="mt-2 block text-4xl">{data?.agentRuns.length ?? 0}</strong>
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-6 text-sm leading-7 text-cyan-50/90">
        <p className="font-semibold">현재 작업 단계</p>
        <p className="mt-2">프로젝트 관리 화면을 먼저 목업 UI로 검증한 뒤, 승인되면 Next.js API + DB 저장/조회 + 프론트 fetch 연동 순서로 구현합니다.</p>
      </div>
    </OpsRouteShell>
  );
}
