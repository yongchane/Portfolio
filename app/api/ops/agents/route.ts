import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getSupabaseAdminClient } from "@/lib/ops/supabase";
import type { OpsAgentRole, OpsAgentRuntime } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const roles = new Set<OpsAgentRole>(["manager", "qa", "security", "uiux", "docs", "github", "coding"]);
const runtimes = new Set<OpsAgentRuntime>(["openclaw", "acp", "codex", "manual"]);

type CreateAgentPayload = {
  id?: string;
  name?: string;
  role?: OpsAgentRole;
  provider?: string;
  runtime?: OpsAgentRuntime;
  model?: string;
  permissions?: Record<string, unknown>;
};

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { data, error } = await client
    .from("ops_agents")
    .select("*")
    .order("name", { ascending: true });

  if (error) return routeError(error.message);
  return NextResponse.json({ ok: true, items: data ?? [], requestContext: await getOpsRequestContext() });
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const payload = await request.json().catch(() => null) as CreateAgentPayload | null;
  if (!payload?.id || !payload.name || !payload.role || !roles.has(payload.role) || !payload.runtime || !runtimes.has(payload.runtime)) {
    return NextResponse.json({ ok: false, message: "id, name, role, and runtime are required." }, { status: 400 });
  }

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("ops_agents")
    .upsert({
      id: payload.id,
      name: payload.name,
      role: payload.role,
      provider: payload.provider ?? null,
      runtime: payload.runtime,
      model: payload.model ?? null,
      status: "active",
      permissions: payload.permissions ?? {},
      updated_at: now,
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
