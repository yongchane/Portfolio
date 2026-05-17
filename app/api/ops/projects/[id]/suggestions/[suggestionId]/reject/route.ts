import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request, context: { params: Promise<{ id: string; suggestionId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id, suggestionId } = await context.params;
  const proxied = await proxyOpsApiRequest({
    path: `/ops/projects/${encodeURIComponent(id)}/suggestions/${encodeURIComponent(suggestionId)}/reject`,
    method: "POST",
  });
  if (proxied) return proxied;

  return NextResponse.json({ ok: false, message: "OPS_API_BASE_URL is required for suggestions API." }, { status: 503 });
}
