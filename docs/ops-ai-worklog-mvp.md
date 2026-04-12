# Portfolio AI worklog MVP

This MVP adds two compatible source-of-truth paths for `/ops`:

- markdown-first: AI work gets written as markdown files first
- DB-first: assistant/runtime can POST structured work directly into Supabase
- the markdown path stays Obsidian-compatible
- `/ops` can show recent AI activity and sync health without changing the rest of the console

## Storage convention

Recommended source root on the Mac mini:

```text
$PORTFOLIO_OPS_WORKSPACE_ROOT/obsidian-vault/01 Worklog/YYYY/MM/DD/
```

Recommended filename:

```text
YYYY-MM-DD-HHmm-agent-repo-scope.md
```

Example:

```text
obsidian-vault/01 Worklog/2026/04/12/2026-04-12-1327-codex-portfolio-ops.md
```

## Minimal frontmatter schema

```yaml
---
type: project-ops
project: Portfolio Ops Console
record_type: ai-worklog
status: completed          # planned | running | completed | blocked
actor: codex               # codex | claude | gemini | openclaw | custom
repo: portfolio
branch: develop
source_machine: mac-mini
session_id: agent:main:subagent:example
run_id: optional-run-id
started_at: 2026-04-12T13:27:00+09:00
finished_at: 2026-04-12T13:44:00+09:00
tags: [ai, ops, portfolio]
---
# 작업 요약
짧은 요약 1~2문장.

## Completed work
- 무엇을 만들었는지
- 어떤 파일/흐름을 건드렸는지

## Decisions
- 왜 이렇게 잘랐는지

## Next actions
- 다음 1~3개

## Blockers
- 없으면 생략
```

Notes remain readable even if the parser ignores unknown fields.

## What the parser actually uses in MVP

- path under `obsidian-vault/01 Worklog/`
- `status`
- `actor` or `agent`
- `repo`
- `branch`
- `source_machine`
- `session_id`
- `run_id`
- `started_at`
- `finished_at`
- standard note data already exported today (`title`, `summary`, `highlights`, `tags`, `updatedAt`)

## Cron-friendly sync command

```bash
npm run ops:source-sync
```

What it does:
1. export markdown notes into local JSON
2. sync local `/ops` data into Supabase
3. prevent overlap with a local lock file

## Watch mode

```bash
npm run ops:watch-source
```

- watches the note roots plus `data/ops/projects.json` and `data/ops/tasks.json`
- debounces bursts of file changes
- uses the same lock protection

## Direct DB-first ingest

If the assistant is running somewhere that can reach the deployed Next server, it can skip local file watching and write directly:

```bash
curl -X POST "$PORTFOLIO_BASE_URL/api/ops/ingest" \
  -H "Authorization: Bearer $PORTFOLIO_OPS_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Assistant shipped a /ops improvement",
    "summary": "Structured worklog persisted directly to Supabase.",
    "project": "Portfolio Ops Console",
    "actor": "openclaw",
    "repo": "portfolio",
    "branch": "develop",
    "status": "completed",
    "artifacts": [
      {
        "artifactType": "decision",
        "summary": "Use direct ingest when runtime-generated work should not depend on a local watcher."
      }
    ]
  }'
```

The server creates a synthetic note row plus matching worklog/artifact rows so `/ops` still has note detail pages and typed artifact cards. It now also derives the matching Obsidian markdown path/content from the same normalized payload and writes that file back into the local vault whenever a writable workspace root is available.

## Single-machine Mac mini setup

1. Set `PORTFOLIO_OPS_WORKSPACE_ROOT`
2. Set Supabase URL + service role env vars
3. Apply `supabase/ops-schema.sql` once
4. Create the `obsidian-vault/01 Worklog/...` folders
5. Run `npm run ops:source-sync` once to verify
6. Add a cron or LaunchAgent for repeated `npm run ops:source-sync`
7. Optionally keep `npm run ops:watch-source` running when actively writing notes
