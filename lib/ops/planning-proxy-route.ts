import { NextResponse } from "next/server";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { proxyOpsApiRequest } from "@/lib/ops/ops-api-proxy";

type PlanningSlice = "ia" | "specifications" | "architecture" | "user-flows" | "wireframes" | "evidence";

export function createPlanningSliceProxyRoute(slice: PlanningSlice) {
  return async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    if (!(await isOpsAuthenticated())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const proxied = await proxyOpsApiRequest({ path: `/ops/projects/${encodeURIComponent(id)}/${slice}` });
    if (proxied) return proxied;

    return NextResponse.json({ ok: false, message: "OPS_API_BASE_URL is required for planning API." }, { status: 503 });
  };
}
