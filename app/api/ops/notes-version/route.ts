import { NextResponse } from "next/server";
import { getNotesSourceData } from "@/lib/ops/notes-source";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getNotesSourceData();

  return NextResponse.json({
    mode: data.mode,
    generatedAt: data.generatedAt,
    notesCount: data.notes.length,
    workspaceRoot: data.workspaceRoot,
    notesRoots: data.notesRoots,
  });
}
