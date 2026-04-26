import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getOpenClawDiagnostics } from "@/lib/ops/openclaw";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isOpsAuthenticated()) || !isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    diagnostics: await getOpenClawDiagnostics(),
    requestContext: await getOpsRequestContext(),
  });
}
