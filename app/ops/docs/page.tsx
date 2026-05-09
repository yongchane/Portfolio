import { OpsRouteShell } from "@/components/ops/OpsRouteShell";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OpsDocsPage() {
  const authenticated = await isOpsAuthenticated();
  const data = authenticated ? await getOpsConsoleData() : null;
  const notes = data?.notes.slice(0, 20) || [];

  return (
    <OpsRouteShell authenticated={authenticated} data={data} title="옵시디언 문서" subtitle="프로젝트 설계와 export 문서를 모아 볼 페이지입니다.">
      <div className="space-y-3">
        {notes.map((note) => (
          <article key={note.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-bold">{note.title}</h3>
                <p className="mt-2 text-sm text-white/65">{note.summary}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{note.type}</span>
            </div>
            <p className="mt-3 text-xs text-white/45">{note.path}</p>
          </article>
        ))}
      </div>
    </OpsRouteShell>
  );
}
