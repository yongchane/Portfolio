import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { ProjectRepositoryListPage } from "@/components/ops/project-management/ProjectRepositoryListPage";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpsProjectsPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;

  return (
    <OpsRouteShell authenticated={authenticated} data={data} title="프로젝트 관리" subtitle="운영 콘솔에 추가한 GitHub 레포지토리 목록입니다.">
      {data && <ProjectRepositoryListPage data={data} />}
    </OpsRouteShell>
  );
}
