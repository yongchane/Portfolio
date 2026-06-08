# Project Onboarding

갱신일: 2026-06-08
브랜치: `develop`
단계: 문서 수집 1단계 `project-onboarding`

## 목적

이 문서는 Portfolio 레포를 처음 이어받는 개발 세션이 프로젝트의 현재 구조, `/ops` 작업 범위, 문서 위치, 검증 명령을 빠르게 파악하기 위한 온보딩 문서다.

## 한 줄 요약

Portfolio는 공개 포트폴리오 사이트이면서, `/ops` 경로에 개인 운영 콘솔과 AI 협업 관리 시스템을 함께 구축 중인 Next.js 15 프로젝트다.

## 현재 핵심 제품

- 공개 포트폴리오: 루트 페이지의 hero, about, tech stack, projects, contact 섹션.
- `/ops` 콘솔: 프로젝트/작업/문서/AI worklog/worker/GitHub/OpenClaw 상태를 관리하는 private 운영 화면.
- aistudy 연동: 중앙 vault인 `aistudy`에서 handoff와 상태보고 issue inbox를 관리한다.

## `/ops` 현재 작업 상태

확인된 구현 범위:

- Supabase-first runtime data loading.
- Supabase 미설정 시 direct workspace read fallback.
- project, task, note, worklog, artifact sync.
- `POST /api/ops/ingest`를 통한 DB-first structured worklog ingest.
- Obsidian-compatible markdown mirror.
- GitHub read-only cache.
- Mac mini watcher 자동화.
- Mac mini worker bridge.
- OpenClaw/Aeyong 상태 surface.
- project repository browser와 project canvas 계열 화면.

현재 MVP 경계:

- production에서는 deployed `/ops`가 Mac mini local file을 직접 읽지 않아야 한다.
- Mac mini local 상태는 worker/sync script가 Supabase로 push하는 구조가 기준이다.
- agent execution은 safe-stub 상태이며, OpenClaw/ACP 실행 정책 연결 전까지 보수적으로 유지한다.
- Docker, Nginx, 고급 네트워크 제어는 후순위다.

## 개발 시작 체크리스트

1. `git status --short --branch`로 브랜치와 dirty file을 확인한다.
2. `git log -1 --oneline`으로 현재 commit을 확인한다.
3. `AGENTS.md`와 `README.md`를 읽는다.
4. 이 문서와 `docs/07_Handoffs/00_Latest_Handoff.md`를 읽는다.
5. `/ops` 작업이면 `docs/02_Architecture/ops-system-map.md`와 `docs/03_Development/ops-commands.md`를 읽는다.
6. 변경 후 가능한 범위에서 `npm run typecheck`, `npm run lint`, `npm run build`를 실행한다.
7. 작업 결과는 `yc-pj-status-send` 흐름으로 `yongchane/aistudy` issue inbox에 보낸다.

## 주요 명령

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run ops:source-sync
npm run ops:doctor
npm run ops:worker:once
```

`ops:*` 명령은 필요한 로컬/Supabase/Mac mini 환경이 있을 때 실행한다.

## 현재 확인된 주의사항

- 2026-06-08 rebase 전에는 `origin/develop`보다 3 commit 뒤처져 있었다. 이후 원격 최신 `develop`을 fast-forward로 반영했다.
- `package-lock.json`은 이번 온보딩 문서 작업 전부터 dirty 상태였다.
- 원격 최신 `eslint.config.mjs`에는 `tmp/**` ignore가 포함되어 있다. 따라서 기존 `tmp/chrome-ops-capture/**`, `tmp/ops-capture/debug-auth.mjs` lint 실패는 최신 기준에서 재검증해야 한다.
- `npm run build`는 선행으로 `ops:sync-github`를 실행해 `data/ops/github-cache.json`을 바꿀 수 있으므로, 문서 작업 검증 후 불필요한 cache diff는 되돌린다.

## 중앙 관리 연결

- 중앙 vault: `/Users/hyeon-yongchan/Documents/opsidian/aistudy`
- 중앙 repo: `yongchane/aistudy`
- 상태보고 destination: `yongchane/aistudy` GitHub Issues
- Portfolio project handoff: `aistudy/20_Projects/portfolio/09_AI_Workflow/00_Dev_Handoff.md`

## 민감정보 규칙

문서, issue, commit message에는 secret 값, token, API key, access code, cookie 값, 개인정보를 기록하지 않는다. 환경변수 이름은 필요한 경우에만 기록한다.
