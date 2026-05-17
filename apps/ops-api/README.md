# Ops API

NestJS backend prototype for the project-management canvas contract.

This app intentionally keeps the same DTO shape as the current Next API routes so the frontend can move from Next route handlers to a standalone backend without changing canvas data models.

## Commands

```bash
npm run ops-api:build
OPS_API_PORT=4010 npm run ops-api:start
```

`ops-api:start` loads environment variables from `.env.local`, `.env.development.local`, `.env.development`, `.env`, and `.vercel/.env.development.local`.

For Supabase-backed reads/writes, configure:

```bash
PORTFOLIO_SUPABASE_URL="https://<project-ref>.supabase.co"
PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

Do not expose `PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY` to browser code. If these values are missing, the API falls back to local JSON files under `data/ops/`.

## Implemented Routes

- `GET /health`
- `GET /ops/projects/:id/canvas`
- `PATCH /ops/projects/:id/canvas`
- `POST /ops/projects/:id/canvas/export`
- `GET /ops/projects/:id/planning`
- `POST /ops/projects/:id/planning/generate`
- `PATCH /ops/projects/:id/planning`
- `GET /ops/projects/:id/ia`
- `GET /ops/projects/:id/specifications`
- `GET /ops/projects/:id/architecture`
- `GET /ops/projects/:id/evidence`
- `GET /ops/projects/:id/suggestions`
- `POST /ops/projects/:id/suggestions`
- `POST /ops/projects/:id/suggestions/generate`
- `POST /ops/projects/:id/suggestions/:suggestionId/approve`
- `POST /ops/projects/:id/suggestions/:suggestionId/reject`
- `POST /ops/projects/:id/export/prd`
- `POST /ops/projects/:id/export/specifications`
- `POST /ops/projects/:id/export/ia`
- `POST /ops/projects/:id/export/user-flow`
- `POST /ops/projects/:id/export/architecture`
- `POST /ops/projects/:id/export/agent-brief`
- `POST /ops/projects/:id/export/canvas`
- `GET /ops/github/repositories/:owner/:repo/tree?branch=develop`
- `POST /ops/github/repositories/:owner/:repo/content`

If `OPS_API_KEY` is set, requests must include `x-ops-api-key`.
