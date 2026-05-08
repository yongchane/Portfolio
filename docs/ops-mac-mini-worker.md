# Portfolio /ops Mac mini Worker

## Purpose

`hyunyongchan.kr/ops` cannot read Mac mini local files or run local OpenClaw commands. The Mac mini worker is the production bridge:

```text
Mac mini worker -> Supabase -> deployed /ops
```

## Commands

```bash
npm run ops:worker:once   # one tick for verification
npm run ops:worker        # daemon loop
```

## Required environment

```bash
PORTFOLIO_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
PORTFOLIO_OPS_WORKER_ID="mac-mini-main"
PORTFOLIO_OPS_WORKER_NAME="Mac mini Ops Worker"
PORTFOLIO_OPS_WORKER_INTERVAL_MS="30000"
```

## What it does

- upserts `ops_worker_heartbeats`
- inserts `ops_host_status`
- inserts `ops_openclaw_status`
- processes one queued `ops_sync_requests` row per tick
- acknowledges one queued `ops_agent_runs` row per tick in safe-stub mode

## Safety

- It only runs allowlisted read/sync commands.
- Agent execution is intentionally `needs_approval` safe-stub until OpenClaw/ACP execution policy is wired.
- Docker/Nginx/network control is not part of MVP.

## Production install direction

Use `pm2` or `launchd` later. MVP verification should start with:

```bash
npm run ops:worker:once
```
