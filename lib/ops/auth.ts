import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

const OPS_COOKIE_NAME = "portfolio_ops_session";
const DEFAULT_ACCESS_CODE = "hy-ops-0408";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;

  return timingSafeEqual(aBuffer, bBuffer);
}

export function getOpsAccessCode() {
  return process.env.PORTFOLIO_OPS_ACCESS_CODE || DEFAULT_ACCESS_CODE;
}

export function getOpsSessionValue() {
  const secret = process.env.PORTFOLIO_OPS_SESSION_SECRET || getOpsAccessCode();
  return sha256(secret);
}

export function verifyOpsAccessCode(input: string) {
  return safeEqual(input, getOpsAccessCode());
}

export async function isOpsAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(OPS_COOKIE_NAME)?.value;

  if (!session) return false;

  return safeEqual(session, getOpsSessionValue());
}

export async function createOpsSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(OPS_COOKIE_NAME, getOpsSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearOpsSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(OPS_COOKIE_NAME);
}
