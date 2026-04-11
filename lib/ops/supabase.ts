import { createClient } from "@supabase/supabase-js";

type SupabaseAdminClient = ReturnType<typeof createClient>;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function isSupabaseConfigured() {
  const url = getRequiredEnv("PORTFOLIO_SUPABASE_URL") || getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(url && serviceRoleKey);
}

export function getSupabaseAdminClient(): SupabaseAdminClient | null {
  const url = getRequiredEnv("PORTFOLIO_SUPABASE_URL") || getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getOpsDataMode() {
  const raw = process.env.PORTFOLIO_OPS_DATA_MODE?.trim().toLowerCase();
  if (raw === "supabase" || raw === "local") return raw;
  return "auto" as const;
}

export async function isSupabaseOpsAvailable() {
  const client = getSupabaseAdminClient();
  if (!client) return false;

  const { error } = await client.from("ops_sync_state").select("key", { count: "exact", head: true }).limit(1);
  return !error;
}

export async function getSupabaseOpsDiagnostics() {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return {
      configured: false,
      available: false,
    };
  }

  const available = await isSupabaseOpsAvailable();
  return {
    configured: true,
    available,
  };
}
