import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getSupabaseAdminClient } from "@/lib/ops/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreateAgentRunPayload = {
  agentId?: string;
  projectId?: string;
  taskId?: string;
  prompt?: string;
  scope?: Record<string, unknown>;
};

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  let query = client
    .from("ops_agent_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return routeError(error.message);
  return NextResponse.json({ ok: true, items: data ?? [], requestContext: await getOpsRequestContext() });
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const payload = await request.json().catch(() => null) as CreateAgentRunPayload | null;
  if (!payload?.agentId || !payload.prompt?.trim()) {
    return NextResponse.json({ ok: false, message: "agentId and prompt are required." }, { status: 400 });
  }

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { data, error } = await client
    .from("ops_agent_runs")
    .insert({
      agent_id: payload.agentId,
      project_id: payload.projectId || null,
      task_id: payload.taskId || null,
      status: "queued",
      prompt: payload.prompt.trim(),
      scope: payload.scope ?? {},
    } as never)
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
