import { NextResponse } from "next/server";
import { getOpsConsoleData } from "@/lib/ops/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getOpsConsoleData();

  return NextResponse.json({
    mode: data.dataSource.mode,
    generatedAt: data.dataSource.generatedAt,
    notesCount: data.dataSource.notesCount,
    workspaceRoot: data.dataSource.workspaceRoot,
    notesRoots: data.dataSource.notesRoots,
  });
}
