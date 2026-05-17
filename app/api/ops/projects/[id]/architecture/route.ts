import { createPlanningSliceProxyRoute } from "@/lib/ops/planning-proxy-route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = createPlanningSliceProxyRoute("architecture");
