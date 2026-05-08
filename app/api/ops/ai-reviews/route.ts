import { NextResponse } from "next/server";
import { getOpsRequestContext, isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { getSupabaseAdminClient } from "@/lib/ops/supabase";
import type { OpsAiReviewCategory, OpsAiReviewSeverity } from "@/lib/ops/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const categories = new Set<OpsAiReviewCategory>(["qa", "security", "feature", "update", "uiux"]);
const severities = new Set<OpsAiReviewSeverity>(["low", "medium", "high", "info"]);

type CreateReviewPayload = {
  projectId?: string;
  repo?: string;
  category?: OpsAiReviewCategory;
  agentId?: string;
  severity?: OpsAiReviewSeverity;
  title?: string;
  comment?: string;
  recommendation?: string;
  evidence?: Record<string, unknown>;
};

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const category = searchParams.get("category");
  let query = client
    .from("ops_ai_reviews")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (projectId) query = query.eq("project_id", projectId);
  if (category && categories.has(category as OpsAiReviewCategory)) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return routeError(error.message);
  return NextResponse.json({ ok: true, items: data ?? [], requestContext: await getOpsRequestContext() });
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) return unauthorized();

  const payload = await request.json().catch(() => null) as CreateReviewPayload | null;
  if (!payload?.projectId || !payload.category || !categories.has(payload.category) || !payload.title || !payload.comment) {
    return NextResponse.json({ ok: false, message: "projectId, category, title, and comment are required." }, { status: 400 });
  }

  const severity = payload.severity && severities.has(payload.severity) ? payload.severity : "info";
  const client = getSupabaseAdminClient();
  if (!client) return missingSupabase();

  const { data, error } = await client
    .from("ops_ai_reviews")
    .insert({
      project_id: payload.projectId,
      repo: payload.repo ?? null,
      category: payload.category,
      agent_id: payload.agentId ?? null,
      severity,
      title: payload.title,
      comment: payload.comment,
      recommendation: payload.recommendation ?? null,
      evidence: payload.evidence ?? {},
      status: "open",
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
