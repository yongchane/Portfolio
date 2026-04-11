# Portfolio /ops Supabase sync foundation

This repo now supports a staged path from local Obsidian markdown to Supabase-backed `/ops` data.

## Target flow

1. Author notes in Obsidian-compatible markdown roots (`obsidian-vault`, `docs`, or explicit roots)
2. Run `npm run ops:sync-supabase`
3. Script upserts projects/tasks/notes into Supabase tables
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
npm run ops:sync-supabase   # upsert projects/tasks/notes into Supabase
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
- schema SQL for `ops_projects`, `ops_tasks`, `ops_notes`, `ops_sync_state`, `ops_sync_runs`
- sync script for projects/tasks/Obsidian notes -> Supabase
- server data loader that can read `/ops` data from Supabase with local fallback
- `/api/ops/notes-version` now reports the active data source metadata

Still up to you / deployment:
- actual Supabase project + secrets
- running the SQL bootstrap once
- wiring env vars in local shell / Vercel
- optional future RLS policies for anon/browser reads if you ever want client-side access
