# /ops 시스템 맵

갱신일: 2026-06-08
브랜치: `develop`

## 목적

`/ops`는 Portfolio 레포 안의 private 운영 콘솔이다. 프로젝트/작업 상태, AI worklog, Obsidian-compatible note, GitHub read-only metadata, Mac mini worker 상태, OpenClaw/Aeyong 상태, Supabase 기반 runtime data를 연결한다.

## Runtime Data Flow

```text
Local markdown/workspace sources
  -> scripts/ops-source-sync.mjs
  -> scripts/sync-ops-supabase.mjs
  -> Supabase ops tables
  -> lib/ops/supabase-data.ts
  -> app/ops and app/api/ops routes

Assistant or server work result
  -> POST /api/ops/ingest or scripts/ingest-ops-work-result.mjs
  -> lib/ops/ingest.ts / lib/ops/ingest-core.mjs
  -> Supabase ops tables
  -> optional Obsidian-compatible markdown mirror

Mac mini worker
  -> scripts/ops-mac-mini-worker.mjs
  -> ops_worker_heartbeats / ops_host_status / ops_openclaw_status
  -> queued sync requests and safe-stub agent runs
  -> deployed /ops visibility

GitHub metadata
  -> scripts/sync-ops-github.mjs
  -> data/ops/github-cache.json
  -> /ops project and release surfaces
```

## Source 선택

`lib/ops/data.ts`가 server-side console data loader의 중심이다.

- `auto` mode: Supabase env가 있고 ops table 접근이 가능하면 Supabase를 사용한다.
- `supabase` mode: Supabase 설정이나 table이 없으면 명확히 실패해야 한다.
- `local` mode: Supabase를 무시하고 local fallback source를 읽는다.
- Supabase가 inactive이면 `lib/ops/notes-source.ts`가 설정된 local note root를 직접 읽는다.

관련 원문 문서는 `docs/ops-supabase-sync.md`와 `README.md`다.

## 주요 화면과 API

- `/ops` overview: `app/ops/page.tsx`, `components/ops/OpsConsole.tsx`, `components/ops/sections/*`.
- `/ops/docs`: `app/ops/docs/page.tsx`.
- `/ops/projects`: `app/ops/projects/**`, `components/ops/project-management/**`.
- `/ops/macmini`: `app/ops/macmini/page.tsx`.
- `/ops/openclaw`: `app/ops/openclaw/page.tsx`.
- `/api/ops/overview`: runtime data endpoint.
- `/api/ops/ingest`: structured worklog/artifact ingest endpoint.
- `/api/ops/worker/status`, `/api/ops/host-status`, `/api/ops/openclaw-status`: 운영 상태 endpoint.
- `/api/ops/sync-requests`, `/api/ops/agent-runs`, `/api/ops/ai-reviews`: queue/review 기반 future agent workflow surface.

## Data Store

- Supabase: project, task, note, worklog, artifact, worker heartbeat, host status, OpenClaw status, sync request, agent, agent run, AI review의 production truth.
- Local JSON: `data/ops/projects.json`, `data/ops/tasks.json`, `data/ops/github-cache.json`, `data/ops/automation-status.json`.
- Local markdown: Obsidian-compatible worklog와 docs. sync를 통해 Supabase에 반영된다.

## 현재 경계

- deployed `/ops`는 Mac mini local file 직접 읽기에 의존하지 않아야 한다.
- Mac mini local 상태는 worker 또는 sync script가 Supabase로 push한다.
- OpenClaw/agent execution은 현재 보수적 safe-stub 상태로 본다.
- Docker, Nginx, 고급 네트워크 제어는 `docs/ops/personal-os-renewal-spec.md` 기준 MVP 밖이다.

