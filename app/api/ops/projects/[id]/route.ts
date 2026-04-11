import { NextResponse } from "next/server";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { updateProject } from "@/lib/ops/mutations";
import type { ProgressState, ProjectStage } from "@/lib/ops/types";

const validProjectStages = new Set<ProjectStage>(["idea", "planning", "building", "verifying", "live"]);
const validProgressStates = new Set<ProgressState>(["todo", "doing", "done", "blocked"]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { id } = await context.params;
  const stage = typeof payload?.stage === "string" && validProjectStages.has(payload.stage as ProjectStage)
    ? (payload.stage as ProjectStage)
    : undefined;
  const summary = typeof payload?.summary === "string" ? payload.summary.trim() : undefined;
  const checklist = Array.isArray(payload?.checklist)
    ? payload.checklist
      .map((item: unknown) => {
        const entry = item as { id?: unknown; status?: unknown };
        if (typeof entry?.id !== "string" || typeof entry?.status !== "string") return null;
        if (!validProgressStates.has(entry.status as ProgressState)) return null;
        return { id: entry.id, status: entry.status as ProgressState };
      })
      .filter(Boolean) as Array<{ id: string; status: ProgressState }>
    : undefined;

  try {
    const project = await updateProject({ id, stage, summary, checklist });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Project update failed" }, { status: 400 });
  }
}
