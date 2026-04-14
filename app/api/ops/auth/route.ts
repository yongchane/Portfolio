import { NextResponse } from "next/server";
import { clearOpsSessionCookie, createOpsSessionCookie, getOpsRequestContext, isOpsAccessConfigured, isOpsAuthenticated, isSameOriginRequest, verifyOpsAccessCode } from "@/lib/ops/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ authenticated: await isOpsAuthenticated(), configured: isOpsAccessConfigured() });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin auth requests are blocked." }, { status: 403 });
  }

  if (!isOpsAccessConfigured()) {
    return NextResponse.json({ ok: false, message: "PORTFOLIO_OPS_ACCESS_CODE is not configured on this deployment." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const accessCode = typeof payload?.accessCode === "string" ? payload.accessCode.trim() : "";

  if (!verifyOpsAccessCode(accessCode)) {
    return NextResponse.json({ ok: false, message: "접근 코드가 올바르지 않습니다." }, { status: 401 });
  }

  await createOpsSessionCookie();
  return NextResponse.json({ ok: true, sessionTtlHours: 8, context: await getOpsRequestContext() });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Cross-origin sign-out requests are blocked." }, { status: 403 });
  }

  await clearOpsSessionCookie();
  return NextResponse.json({ ok: true });
}
