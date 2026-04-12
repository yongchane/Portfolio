import { NextRequest, NextResponse } from "next/server";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsIngestToken, ingestOpsWorklog, isOpsIngestAvailable, type OpsIngestWorklogInput } from "@/lib/ops/ingest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const available = await isOpsIngestAvailable();
  if (!available) {
    return NextResponse.json({ message: "Supabase ops ingest is not available." }, { status: 503 });
  }

  let payload: OpsIngestWorklogInput;
  try {
    payload = (await request.json()) as OpsIngestWorklogInput;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await ingestOpsWorklog(payload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Ingest failed." },
      { status: 400 },
    );
  }
}

async function isAuthorized(request: NextRequest) {
  if (await isOpsAuthenticated()) return true;

  const configuredToken = getOpsIngestToken();
  if (!configuredToken) return false;

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = request.headers.get("x-ops-ingest-token")?.trim() || "";
  const token = bearerToken || headerToken;
  return Boolean(token) && token === configuredToken;
}
