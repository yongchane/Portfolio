import { NextResponse } from "next/server";

type ProxyOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export function getOpsApiBaseUrl() {
  return process.env.OPS_API_BASE_URL?.trim() || process.env.PORTFOLIO_OPS_API_BASE_URL?.trim() || "";
}

export async function proxyOpsApiRequest({ path, method = "GET", body }: ProxyOptions) {
  const baseUrl = getOpsApiBaseUrl();
  if (!baseUrl) return null;

  const headers: HeadersInit = {
    accept: "application/json",
  };
  const apiKey = process.env.OPS_API_KEY?.trim();
  if (apiKey) headers["x-ops-api-key"] = apiKey;

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, init);
    const text = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "x-ops-backend-source": "nest",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        backend: "nest",
        message: error instanceof Error ? error.message : "Nest ops-api proxy failed",
      },
      {
        status: 502,
        headers: {
          "x-ops-backend-source": "nest",
        },
      },
    );
  }
}
