# /ops 개발 명령

갱신일: 2026-06-08
브랜치: `develop`

## 기본 명령

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run ci
```

`npm run ci`는 lint, typecheck, build를 순서대로 실행한다.

## /ops Runtime / Sync 명령

```bash
npm run ops:sync-notes
npm run ops:sync-supabase
npm run ops:source-sync
npm run ops:watch-source
npm run ops:ensure-watch
npm run ops:watch-status
npm run ops:watch-stop
npm run ops:ingest-work
npm run ops:sync-github
npm run ops:worker:once
npm run ops:worker
npm run ops:doctor
```

## 명령별 의미

- `ops:sync-notes`: local markdown note를 `data/ops/notes-export.json`으로 export한다.
- `ops:sync-supabase`: Supabase admin env가 있을 때 project, task, note, worklog, artifact를 Supabase로 sync한다.
- `ops:source-sync`: lock 보호가 있는 cron-friendly sync wrapper.
- `ops:watch-source`: source root를 watch하고 변경 후 source sync를 실행한다.
- `ops:ensure-watch`: local watcher automation을 시작하거나 살아 있는지 확인한다.
- `ops:watch-status`: watcher automation status를 읽는다.
- `ops:watch-stop`: watcher automation을 중지한다.
- `ops:ingest-work`: structured work result를 local 또는 HTTP `/api/ops/ingest` 입력으로 변환한다.
- `ops:sync-github`: GitHub read-only cache를 갱신한다.
- `ops:worker:once`: Mac mini worker 1 tick을 검증용으로 실행한다.
- `ops:worker`: worker loop를 시작한다.
- `ops:doctor`: Supabase ops table 접근 가능 여부를 확인한다.

## 환경변수 규칙

문서에는 환경변수 이름만 기록하고 실제 값은 기록하지 않는다.

`/ops`에서 자주 쓰는 이름:

- `PORTFOLIO_OPS_WORKSPACE_ROOT`
- `PORTFOLIO_OPS_NOTE_ROOTS`
- `PORTFOLIO_OPS_OBSIDIAN_EXPORT_ROOT`
- `PORTFOLIO_OPS_DATA_MODE`
- `PORTFOLIO_SUPABASE_URL`
- `PORTFOLIO_SUPABASE_SERVICE_ROLE_KEY`
- `PORTFOLIO_OPS_INGEST_TOKEN`
- `PORTFOLIO_OPS_WORKER_ID`
- `PORTFOLIO_OPS_WORKER_NAME`
- `PORTFOLIO_OPS_WORKER_INTERVAL_MS`
- `GITHUB_TOKEN`

secret 값, token, access code, cookie, API key 값은 문서와 issue에 쓰지 않는다.

## 검증 기준

docs-only 변경도 가능한 범위에서 아래 명령을 실행한다.

```bash
npm run typecheck
npm run lint
npm run build
```

`/ops` runtime 변경이면 환경이 준비된 경우 다음 명령도 고려한다.

```bash
npm run ops:source-sync
npm run ops:doctor
npm run ops:worker:once
```

Supabase, Mac mini, GitHub token 등 필요한 환경이 없는 명령은 실행하지 않고 이유를 기록한다.

