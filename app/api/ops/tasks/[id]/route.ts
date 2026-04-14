import { NextResponse } from "next/server";
import { isOpsAuthenticated, isSameOriginRequest } from "@/lib/ops/auth";
import { updateTask } from "@/lib/ops/mutations";
import type { TaskStatus } from "@/lib/ops/types";

const validTaskStatuses = new Set<TaskStatus>(["planned", "doing", "verifying", "shipped", "blocked"]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "Cross-origin mutation blocked" }, { status: 403 });
  }

  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const { id } = await context.params;
  const status = typeof payload?.status === "string" && validTaskStatuses.has(payload.status as TaskStatus)
    ? (payload.status as TaskStatus)
    : undefined;
  const summary = typeof payload?.summary === "string" ? payload.summary.trim() : undefined;
  const nextActions = Array.isArray(payload?.nextActions)
    ? payload.nextActions.map((item: unknown) => String(item).trim()).filter(Boolean)
    : undefined;
  const needsDecision = Array.isArray(payload?.needsDecision)
    ? payload.needsDecision.map((item: unknown) => String(item).trim()).filter(Boolean)
    : undefined;

  try {
    const task = await updateTask({ id, status, summary, nextActions, needsDecision });
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Task update failed" }, { status: 400 });
  }
}
