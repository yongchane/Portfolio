import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";
import { buildOpsOverviewModel } from "@/lib/ops/overview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const data = await getOpsConsoleData();

  return NextResponse.json({
    ok: true,
    overview: buildOpsOverviewModel(data),
    requestContext: await getOpsRequestContext(),
  });
}

async function isAuthorized(request: Request) {
  return (await isOpsAuthenticated()) && isSameOriginRequest(request);
}
