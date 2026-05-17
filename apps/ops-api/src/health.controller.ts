import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    const supabaseConfigured = Boolean(
      (process.env.PORTFOLIO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    );

    return {
      ok: true,
      service: "ops-api",
      generatedAt: new Date().toISOString(),
      dataSources: {
        projects: supabaseConfigured ? "supabase" : "local-json",
        tasks: supabaseConfigured ? "supabase" : "local-json",
        canvasStore: supabaseConfigured ? "supabase" : "local-json",
        repoAnalysis: "live-github",
      },
      env: {
        supabaseConfigured,
        apiKeyRequired: Boolean(process.env.OPS_API_KEY?.trim()),
      },
    };
  }
}
