import { NextResponse } from "next/server";
import {
  getOpsRequestContext,
  isOpsAuthenticated,
  isSameOriginRequest,
} from "@/lib/ops/auth";
import { getOpsIngestToken } from "@/lib/ops/ingest";
import { applyOpsIngest } from "@/lib/ops/ingest-core.mjs";
import {
  syncNoteToSupabaseIfAvailable,
  syncProjectToSupabaseIfAvailable,
  syncTaskToSupabaseIfAvailable,
} from "@/lib/ops/mutations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  try {
    const result = await applyOpsIngest(payload, { repoRoot: process.cwd() });
    const [taskMirror, projectMirror, noteMirror] = await Promise.all([
      syncTaskToSupabaseIfAvailable(result.task),
      result.project
        ? syncProjectToSupabaseIfAvailable(result.project)
        : Promise.resolve(null),
      result.note
        ? syncNoteToSupabaseIfAvailable(result.note)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ...result,
      persistence: {
        ...result.persistence,
        localJsonUpdated: true,
        workspaceMirrorWritten: Boolean(result.note),
        supabaseTaskMirrored: taskMirror.mirrored,
        supabaseProjectMirrored: Boolean(projectMirror?.mirrored),
        supabaseNoteMirrored: Boolean(noteMirror?.mirrored),
        writeStrategy: taskMirror.strategy,
      },
      requestContext: await getOpsRequestContext(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Ingest failed",
      },
      { status: 400 },
    );
  }
}

async function isAuthorized(request: Request) {
  if (await isOpsAuthenticated()) {
    return isSameOriginRequest(request);
  }

  const configuredToken = getOpsIngestToken();
  if (!configuredToken) return false;

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerToken = request.headers.get("x-ops-ingest-token")?.trim() || "";
  const token = bearerToken || headerToken;
  return Boolean(token) && token === configuredToken;
}
