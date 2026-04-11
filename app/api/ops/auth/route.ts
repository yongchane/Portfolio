import { NextResponse } from "next/server";
import { clearOpsSessionCookie, createOpsSessionCookie, isOpsAuthenticated, verifyOpsAccessCode } from "@/lib/ops/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ authenticated: await isOpsAuthenticated() });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const accessCode = typeof payload?.accessCode === "string" ? payload.accessCode : "";

  if (!verifyOpsAccessCode(accessCode)) {
    return NextResponse.json({ ok: false, message: "접근 코드가 올바르지 않습니다." }, { status: 401 });
  }

  await createOpsSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearOpsSessionCookie();
  return NextResponse.json({ ok: true });
}
