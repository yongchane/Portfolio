# Portfolio 문서 시작점

갱신일: 2026-06-08
브랜치: `develop`
문서 수집 단계: `project-onboarding`

이 문서는 Portfolio 레포에서 새 개발 세션을 시작할 때 가장 먼저 읽는 진입점이다. 특히 `/ops` 콘솔 작업을 이어받는 사람과 AI 세션이 빠르게 맥락을 잡도록 돕는다.

## 먼저 읽을 문서

1. `AGENTS.md`
2. `README.md`
3. `docs/00_Start_Here.md`
4. `docs/01_Project_Overview/project-onboarding.md`
5. `docs/07_Handoffs/00_Latest_Handoff.md`
6. `docs/02_Architecture/ops-system-map.md`
7. `docs/03_Development/ops-commands.md`
8. `docs/08_AI_Workflow/aistudy-skill-validation.md`

작업 범위에 따라 다음 문서를 이어서 읽는다.

- `docs/ops-supabase-sync.md`: Supabase-first `/ops` 런타임과 ingest 구조.
- `docs/ops-ai-worklog-mvp.md`: AI worklog markdown, DB-first ingest, artifact 규칙.
- `docs/ops-automation-mac-mini.md`: Mac mini watcher 자동화.
- `docs/ops-mac-mini-worker.md`: production bridge 역할의 Mac mini worker.
- `docs/ops/personal-os-renewal-spec.md`: `/ops` 제품 방향과 MVP 범위.
- `docs/plans/*.md`: 날짜별 설계/구현 계획.

## 현재 프로젝트 형태

Portfolio는 Next.js 15, TypeScript 기반 포트폴리오 앱이다. 루트 화면은 공개 포트폴리오이고, `/ops`는 프로젝트 관리, AI 작업 기록, GitHub cache, Mac mini 상태, OpenClaw/Aeyong 상태, Supabase 기반 운영 데이터를 다루는 private 운영 콘솔이다.

`/ops`의 의도된 production data path는 다음과 같다.

```text
Mac mini worker / local sync / assistant ingest
  -> Supabase ops tables
  -> deployed /ops console
```

Supabase가 설정되지 않았거나 접근할 수 없는 개발 환경에서는 local workspace 직접 읽기 fallback이 남아 있다.

## 주요 경로

- `app/ops/**`: `/ops` 페이지와 라우트 shell.
- `app/api/ops/**`: auth, overview data, ingest, worker status, sync request, task, project, OpenClaw, host status, AI review, agent run API.
- `components/ops/**`: console UI section과 project-management view.
- `lib/ops/**`: data loader, Supabase adapter, ingest normalization, auth, artifact/worklog extraction, selector, local source read.
- `scripts/ops-*.mjs`, `scripts/sync-ops-*.mjs`: sync, watcher, worker, doctor, GitHub cache, ingest command.
- `data/ops/*.json`: local fallback/cache data.
- `supabase/ops-schema.sql`: `/ops` table bootstrap SQL.
- `ops/macos/**`, `ops/cron/**`: Mac mini 자동화 설치 예시.

## 문서상 주의점

aistudy handoff에는 `docs/ops-codex-handoff.md`가 언급되어 있다. 원격 최신 `develop`을 반영한 뒤 현재 작업트리에는 이 파일이 존재한다. 새 문서 수집 단계의 최신 요약은 `docs/07_Handoffs/00_Latest_Handoff.md`를 사용하고, 기존 `/ops` 구현 handoff는 `docs/ops-codex-handoff.md`도 함께 읽는다.

## 안전 규칙

- 명시 요청이 없으면 `develop`에서 작업한다.
- secret 값, API key, token, access code, cookie 값, 개인정보를 문서나 issue에 기록하지 않는다.
- 환경변수 이름은 문서화할 수 있지만 실제 값은 기록하지 않는다.
- 기존 dirty worktree 변경은 사용자가 만든 것으로 보고, 이 세션에서 만든 변경과 분리해서 다룬다.
