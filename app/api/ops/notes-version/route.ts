import { NextResponse } from "next/server";
import { isOpsAuthenticated } from "@/lib/ops/auth";
import { getOpsConsoleData } from "@/lib/ops/data";
import { buildOpsVersionSnapshot } from "@/lib/ops/version";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await isOpsAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getOpsConsoleData();

  return NextResponse.json(buildOpsVersionSnapshot(data));
}
