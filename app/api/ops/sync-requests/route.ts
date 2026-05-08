import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getSupabaseAdminClient } from "@/lib/ops/supabase";
import type { OpsSyncRequestType } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowedTypes = new Set<OpsSyncRequestType>(["worklogs", "github", "openclaw", "host", "all"]);

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { data, error } = await client
    .from("ops_sync_requests")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(50);

  if (error) return routeError(error.message);
  return NextResponse.json({ ok: true, items: data ?? [], requestContext: await getOpsRequestContext() });
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const payload = await request.json().catch(() => null) as { type?: OpsSyncRequestType; requestedBy?: string } | null;
  const type = payload?.type;
  if (!type || !allowedTypes.has(type)) {
    return NextResponse.json({ ok: false, message: "Invalid sync request type." }, { status: 400 });
  }

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { data, error } = await client
    .from("ops_sync_requests")
    .insert({ type, status: "queued", requested_by: payload?.requestedBy ?? "ops-ui" } as never)
    .select("*")
    .single();

  if (error) return routeError(error.message);
  return NextResponse.json({ ok: true, item: data, requestContext: await getOpsRequestContext() });
}

async function isAuthorized(request: Request) {
  return (await isOpsAuthenticated()) && isSameOriginRequest(request);
}

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

function missingSupabase() {
  return NextResponse.json({ ok: false, message: "Supabase admin client is not configured." }, { status: 503 });
}

function routeError(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 500 });
}
