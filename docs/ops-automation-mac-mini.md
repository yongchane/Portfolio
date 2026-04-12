# Portfolio /ops automation on Mac mini

This is the production-ready path for making Portfolio `/ops` automatic on the Mac mini.

## Goal

After the one-time install step, manual `npm run ops:...` is **not** the intended operating model anymore.
The background watcher will:

1. boot once,
2. run an initial sync,
3. watch Obsidian/docs/tasks/projects sources,
4. debounce changes,
5. prevent overlap with the lock file,
6. keep writing automation health into `data/ops/automation-status.json`,
7. let `/ops` surface the current automation mode/state/heartbeat/last run.

## Files added for this

- `scripts/ops-automation.mjs`
- `scripts/ops-source-sync.mjs` (status-file aware)
- `data/ops/automation-status.json`
- `ops/macos/portfolio-ops-watch.plist.template`
- `ops/macos/install-launchagent.sh`
- `ops/cron/portfolio-ops-watch.cron.example`
- `.env.ops.example`

## Recommended: launchd on Mac mini

```bash
cd /path/to/Portfolio
cp .env.ops.example .env.ops.local   # optional local reference only
export PORTFOLIO_OPS_WORKSPACE_ROOT=/absolute/path/to/workspace
export PORTFOLIO_OPS_DATA_MODE=auto
export PORTFOLIO_OPS_NOTE_ROOTS="$PORTFOLIO_OPS_WORKSPACE_ROOT/obsidian-vault:$PORTFOLIO_OPS_WORKSPACE_ROOT/docs"
bash ops/macos/install-launchagent.sh
```

What it does:
- writes `~/Library/LaunchAgents/com.yongchane.portfolio.ops-watch.plist`
- loads it with `launchctl`
- kickstarts the watcher immediately
- keeps it alive across restarts/login sessions

## Alternative: cron watchdog

If you prefer cron, render the example into your crontab with real paths:

```bash
crontab -e
```

Then paste a filled version of:

```cron
* * * * * cd /absolute/path/to/Portfolio && /usr/bin/env PORTFOLIO_OPS_WORKSPACE_ROOT="/absolute/path/to/workspace" PORTFOLIO_OPS_DATA_MODE="auto" PORTFOLIO_OPS_NOTE_ROOTS="/absolute/path/to/workspace/obsidian-vault:/absolute/path/to/workspace/docs" PORTFOLIO_OPS_AUTOMATION_MODE="cron" /absolute/path/to/node scripts/ops-automation.mjs ensure-watch >> .ops-runtime/cron.ensure-watch.log 2>&1
```

This does **not** run full sync every minute. It only ensures the watcher exists.
The watcher itself does the syncs.

## Operational visibility

### File status
- `data/ops/automation-status.json` → machine-readable status used by `/ops`
- `.ops-runtime/ops-watch.log` → watcher log
- `.ops-runtime/launchd.stdout.log` / `.ops-runtime/launchd.stderr.log` → launchd stdio
- `.ops-source-sync.lock` → overlap prevention

### Local checks

```bash
node scripts/ops-automation.mjs status
node scripts/ops-automation.mjs stop
node scripts/ops-automation.mjs ensure-watch
```

### `/ops` UI

`/ops` now shows:
- automation mode/state
- heartbeat timestamp
- pid
- last run result
- status/log/lock file paths
- latest automation message / suggested next action

## Failure behavior

- stale overlap lock is still cleaned up by `ops-source-sync.mjs`
- `ensure-watch` is idempotent; if a watcher is already alive, it exits cleanly
- `daemon` refuses to double-start when a valid pid file already exists
- unexpected watcher exit is recorded in `automation-status.json`
- launchd `KeepAlive` or cron `ensure-watch` brings it back

## When manual npm commands are still useful

Only for:
- local debugging
- one-off verification
- development without the background automation

They are **not required** for the normal Mac mini operating path after install.
