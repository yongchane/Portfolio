# Portfolio /ops Supabase sync foundation

This repo now supports a staged path from local Obsidian markdown to Supabase-backed `/ops` data.

## Target flow

1. Author notes in Obsidian-compatible markdown roots (`obsidian-vault`, `docs`, or explicit roots)
2. Run `npm run ops:source-sync` (or `npm run ops:sync-supabase` if notes export already happened)
3. Script upserts projects/tasks/notes/worklogs into Supabase tables
4. Next `/ops` server loader reads from Supabase when configured
5. If Supabase is missing/unready, `/ops` falls back to the existing local live/export path

## Required env

Server/runtime:

```bash
export PORTFOLIO_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
# optional: auto | supabase | local (default: auto)
export PORTFOLIO_OPS_DATA_MODE="auto"
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
npm run ops:sync-notes      # existing JSON export snapshot
npm run ops:sync-supabase   # upsert projects/tasks/notes/worklogs into Supabase
npm run ops:source-sync     # cron-friendly export + sync with lock
npm run ops:watch-source    # local watch loop with debounce + lock
npm run dev
```

## Loader behavior

- `PORTFOLIO_OPS_DATA_MODE=auto`:
  - use Supabase if env exists and ops tables are reachable
  - otherwise fall back to existing local/export loader
- `PORTFOLIO_OPS_DATA_MODE=supabase`:
  - fail loudly if Supabase/env/schema is missing
- `PORTFOLIO_OPS_DATA_MODE=local`:
  - ignore Supabase and use existing local/export loader

## Current scope

Implemented now:
- schema SQL for `ops_projects`, `ops_tasks`, `ops_notes`, `ops_worklogs`, `ops_sync_state`, `ops_sync_runs`
- sync script for projects/tasks/Obsidian notes -> Supabase, including rich project metadata (`sectors`, `checklist`, `admin_surfaces`, `vault_views`, `github_focus`) and note link graph data
- AI worklog extraction from `obsidian-vault/01 Worklog/**` into typed Supabase rows
- cron-friendly source sync command and local watch loop with debounce + lock file protection
- server data loader that can read `/ops` data from Supabase with local fallback
- `/ops` overview/settings now surface recent AI work and source-health state (preferred mode, Supabase configured/reachable, latest sync status/message, worklog counts)
- `/api/ops/notes-version` now reports the active data source metadata including worklog counts

Still up to you / deployment:
- actual Supabase project + secrets
- running the SQL bootstrap once
- wiring env vars in local shell / Vercel
- optional future RLS policies for anon/browser reads if you ever want client-side access
