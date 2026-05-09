import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { GitHubRepositoryBrowserPage } from "@/components/ops/project-management/GitHubRepositoryBrowserPage";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewOpsProjectPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;

  return (
    <OpsRouteShell authenticated={authenticated} data={data} title="GitHub에서 프로젝트 추가" subtitle="내 GitHub 레포 중 운영 콘솔에서 관리할 프로젝트를 고릅니다.">
      {data && <GitHubRepositoryBrowserPage data={data} />}
    </OpsRouteShell>
  );
}
