# Portfolio /ops Supabase sync foundation

This repo now treats Supabase as the intended runtime source for `/ops`, with direct workspace reads kept only as a local fallback.

## Target flow

### A. Markdown-first path

1. Author notes in Obsidian-compatible markdown roots (`obsidian-vault`, `docs`, or explicit roots)
2. Run `npm run ops:source-sync` (or `npm run ops:sync-supabase` directly)
3. Script upserts projects/tasks/notes/worklogs/artifacts into Supabase tables
4. Next `/ops` server loader reads from Supabase when configured
5. If Supabase is missing/unready, `/ops` falls back to direct workspace reads only

### B. DB-first assistant ingest path

1. Assistant/runtime sends a structured `POST /api/ops/ingest`
2. Next server validates ops auth cookie or `PORTFOLIO_OPS_INGEST_TOKEN`
3. Server upserts `ops_notes`, `ops_worklogs`, `ops_artifacts`, and sync metadata directly in Supabase
4. `/ops` polling notices the new signature and auto-refreshes without any local watcher

## Required env

Server/runtime:

```bash
export PORTFOLIO_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
# optional: auto | supabase | local (default: auto)
export PORTFOLIO_OPS_DATA_MODE="auto"
# optional but recommended for server-to-server assistant ingest
export PORTFOLIO_OPS_INGEST_TOKEN="long-random-shared-secret"
```

Source roots:

```bash
export PORTFOLIO_OPS_WORKSPACE_ROOT="/absolute/path/to/workspace"
# optional override for exact roots
export PORTFOLIO_OPS_NOTE_ROOTS="/abs/path/obsidian-vault:/abs/path/docs"
```

## SQL bootstrap

Apply `supabase/ops-schema.sql` in Supabase before the first sync.

## Commands

```bash
npm run ops:sync-supabase   # upsert projects/tasks/notes/worklogs into Supabase
npm run ops:source-sync     # cron-friendly sync with lock
npm run ops:watch-source    # local watch loop with debounce + lock
npm run dev
```

## Direct ingest API

`POST /api/ops/ingest`

Auth options:
- authenticated `/ops` cookie session, or
- `Authorization: Bearer $PORTFOLIO_OPS_INGEST_TOKEN`
- `x-ops-ingest-token: $PORTFOLIO_OPS_INGEST_TOKEN`

Minimal payload:

```json
{
  "title": "Portfolio ops DB-first ingest landed",
  "summary": "Assistant saved a structured worklog directly into Supabase.",
  "project": "Portfolio Ops Console",
  "actor": "openclaw",
  "repo": "portfolio",
  "branch": "develop",
  "status": "completed",
  "sessionId": "agent:main:subagent:example",
  "tags": ["ai", "ops", "portfolio"],
  "highlights": [
    "Added direct POST /api/ops/ingest path",
    "Worklog and typed artifacts now persist without local watcher"
  ],
  "decisions": [
    "Keep markdown-first flow, but add DB-first bypass for runtime-generated records"
  ],
  "nextActions": [
    "Wire real assistant runtime to call this endpoint after meaningful work"
  ],
  "artifacts": [
    {
      "artifactType": "decision",
      "summary": "DB-first ingest closes the last automatic write loop for assistant work records."
    }
  ]
}
```

Behavior:
- upserts one synthetic `ops_notes` row (for note-detail surfaces)
- upserts one `ops_worklogs` row
- upserts one `worklog` artifact plus optional `decision` / `learning` artifacts
- updates sync metadata so `/ops` notices and refreshes on the next poll

## Loader behavior

- `PORTFOLIO_OPS_DATA_MODE=auto`:
  - use Supabase if env exists and ops tables are reachable
  - otherwise fall back to direct workspace reads
- `PORTFOLIO_OPS_DATA_MODE=supabase`:
  - fail loudly if Supabase/env/schema is missing
- `PORTFOLIO_OPS_DATA_MODE=local`:
  - ignore Supabase and use direct workspace reads

## Current scope

Implemented now:
- schema SQL for `ops_projects`, `ops_tasks`, `ops_notes`, `ops_worklogs`, `ops_artifacts`, `ops_sync_state`, `ops_sync_runs`
- sync script for projects/tasks/Obsidian notes -> Supabase, including rich project metadata (`sectors`, `checklist`, `admin_surfaces`, `vault_views`, `github_focus`) and note link graph data
- AI worklog extraction from `obsidian-vault/01 Worklog/**` into typed Supabase rows
- automatic typed artifact extraction for `worklog`, `decision`, and `learning` records from synced notes/worklogs
- cron-friendly source sync command and local watch loop with debounce + lock file protection
- direct assistant/server ingest route (`POST /api/ops/ingest`) that writes structured worklogs/artifacts straight into Supabase without local file watching
- server data loader that reads `/ops` data from Supabase first, with direct workspace fallback
- `/ops` overview/settings/notes now surface recent AI work, typed artifacts, linked decisions/learnings, and source-health state (preferred mode, Supabase configured/reachable, latest sync status/message, worklog/artifact counts)
- `/api/ops/notes-version` now reports the active data source metadata including worklog counts

Still up to you / deployment:
- actual Supabase project + secrets
- running the SQL bootstrap once
- wiring env vars in local shell / Vercel
- optional future RLS policies for anon/browser reads if you ever want client-side access
