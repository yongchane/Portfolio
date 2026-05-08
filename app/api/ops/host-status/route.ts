import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getSupabaseAdminClient } from "@/lib/ops/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ ok: false, message: "Supabase admin client is not configured." }, { status: 503 });
  }

  const { data, error } = await client
    .from("ops_host_status")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [], requestContext: await getOpsRequestContext() });
}

async function isAuthorized(request: Request) {
  return (await isOpsAuthenticated()) && isSameOriginRequest(request);
}
