import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const proxied = await proxyOpsApiRequest({ path: `/ops/projects/${encodeURIComponent(id)}/suggestions` });
  if (proxied) return proxied;

  return NextResponse.json({ ok: false, message: "OPS_API_BASE_URL is required for suggestions API." }, { status: 503 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const proxied = await proxyOpsApiRequest({
    path: `/ops/projects/${encodeURIComponent(id)}/suggestions`,
    method: "POST",
    body: payload,
  });
  if (proxied) return proxied;

  return NextResponse.json({ ok: false, message: "OPS_API_BASE_URL is required for suggestions API." }, { status: 503 });
}
