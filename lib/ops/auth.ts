import { cookies, headers } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const OPS_COOKIE_NAME = "portfolio_ops_session";
const DEV_DEFAULT_ACCESS_CODE = "hy-ops-0408";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;

  return timingSafeEqual(aBuffer, bBuffer);
}

function getSessionSecret() {
  return process.env.PORTFOLIO_OPS_SESSION_SECRET?.trim() || process.env.PORTFOLIO_OPS_ACCESS_CODE?.trim() || DEV_DEFAULT_ACCESS_CODE;
}

function buildSessionSignature(expiresAt: number) {
  return createHmac("sha256", getSessionSecret()).update(String(expiresAt)).digest("hex");
}

export function getOpsAccessCode() {
  const configured = process.env.PORTFOLIO_OPS_ACCESS_CODE?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return DEV_DEFAULT_ACCESS_CODE;
  return undefined;
}

export function isOpsAccessConfigured() {
  return Boolean(getOpsAccessCode());
}

export function verifyOpsAccessCode(input: string) {
  const configured = getOpsAccessCode();
  if (!configured) return false;
  return safeEqual(input, configured);
}

export async function isOpsAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(OPS_COOKIE_NAME)?.value;

  if (!session) return false;

  const [expiresAtRaw, signature] = session.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAt || !signature) return false;
  if (Date.now() >= expiresAt) return false;

  return safeEqual(signature, buildSessionSignature(expiresAt));
}

export async function createOpsSessionCookie() {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = `${expiresAt}.${buildSessionSignature(expiresAt)}`;

  cookieStore.set(OPS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearOpsSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(OPS_COOKIE_NAME);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function getOpsRequestContext() {
  const headerStore = await headers();
  return {
    host: headerStore.get("host") || undefined,
    forwardedProto: headerStore.get("x-forwarded-proto") || undefined,
    userAgent: headerStore.get("user-agent") || undefined,
    fingerprint: sha256(`${headerStore.get("host") || ""}|${headerStore.get("user-agent") || ""}`).slice(0, 12),
  };
}
