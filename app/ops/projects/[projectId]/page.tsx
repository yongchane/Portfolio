import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { ProjectCanvasPage } from "@/components/ops/project-management/ProjectCanvasPage";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpsProjectCanvasRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;
  const { projectId } = await params;

  return (
    <OpsRouteShell
      authenticated={authenticated}
      data={data}
      title="프로젝트 Canvas"
      subtitle="선택한 레포의 시스템 아키텍처와 IA를 시각화합니다."
      hideHeader
      mainClassName="!p-0 overflow-hidden"
    >
      {data && <ProjectCanvasPage data={data} projectId={projectId} />}
    </OpsRouteShell>
  );
}
