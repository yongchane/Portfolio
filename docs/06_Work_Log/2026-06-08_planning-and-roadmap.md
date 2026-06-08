# 2026-06-08 Planning and Roadmap Work Log

작성일: 2026-06-08
브랜치: `develop`
문서 수집 단계: `planning-and-roadmap`
관련 aistudy issue: `#2`는 1단계 `project-onboarding` 수집 완료

## 목적

Portfolio `/ops`의 다음 개발 목표, 우선순위, 기능 단위 계획, 미정 사항을 한국어 문서로 정리한다.

## 시작 상태

확인된 사실:

- 현재 브랜치: `develop`
- 현재 commit: `376ef7d 새 노드 추가 기능`
- 작업 시작 시 `origin/develop`보다 3 commit 뒤처져 있었음.
- 이후 원격 최신 `develop`을 fast-forward로 반영했음.
- 기존 dirty file: `package-lock.json`
- 1단계 `project-onboarding` 문서가 작업트리에 untracked 상태로 남아 있음.

진행 결정:

- 사용자가 명시하기 전에는 merge/rebase를 수행하지 않았다.
- 이후 사용자의 요청으로 `git pull --rebase`를 적용했고, 결과는 fast-forward였다.
- `package-lock.json` 기존 변경은 건드리지 않았다.
- 문서 생성/수정은 한국어로 작성하고, 코드 식별자/명령어/파일명/API path/package/script 이름은 원문 영어를 유지했다.

## 읽은 문서

Portfolio:

- `AGENTS.md`
- `README.md`
- `docs/00_Start_Here.md`
- `docs/01_Project_Overview/project-onboarding.md`
- `docs/07_Handoffs/00_Latest_Handoff.md`
- `docs/08_AI_Workflow/aistudy-skill-validation.md`
- `docs/ops/personal-os-renewal-spec.md`
- `docs/ops/synapse-ui-design.md`
- `docs/plans/2026-05-09-ops-projects-v2-design.md`
- `docs/plans/2026-05-09-ops-routing-project-management-mock.md`

aistudy:

- `/Users/hyeon-yongchan/Documents/opsidian/aistudy/20_Projects/portfolio/09_AI_Workflow/00_Dev_Handoff.md`
- `/Users/hyeon-yongchan/Documents/opsidian/aistudy/10_Agent_System/02_Skills/yc-pj-documentation.md`
- `/Users/hyeon-yongchan/Documents/opsidian/aistudy/10_Agent_System/02_Skills/yc-pj-status-send.md`

## 생성/수정 문서

생성:

- `docs/04_Features/ops-dashboard-spec.md`
- `docs/04_Features/obsidian-visualization-spec.md`
- `docs/06_Work_Log/2026-06-08_planning-and-roadmap.md`

수정:

- `docs/07_Handoffs/00_Latest_Handoff.md`

## `/ops` 다음 작업 우선순위

1. P0: 최신 `develop` 기준 검증 baseline을 재확인한다.
2. P1: Supabase-first production data trust를 검증하고 worker heartbeat/status를 안정화한다.
3. P1: Project Mission Control을 health score/action queue/AI Review Board v2 중심으로 정착시킨다.
4. P1: Docs/Vault 작업 도서관을 bucket, orphan action, artifact timeline 중심으로 고도화한다.
5. P2: Floating Agent Panel과 agent run queue/approval/result 기록을 연결한다.
6. P2: GitHub read-only cache freshness와 CI/security/release signal을 운영 판단에 반영한다.
7. P3: Docker/Nginx/network/실시간 chat/배포 자동 제어는 후순위로 유지한다.

## lint 처리 방향

현재 상태:

- rebase 전에는 `npm run lint`가 `tmp/chrome-ops-capture/**`, `tmp/ops-capture/debug-auth.mjs`를 검사해 실패했다.
- 원격 최신 `eslint.config.mjs`에는 `tmp/**` ignore가 포함되어 있다.
- 따라서 최신 기준에서는 `npm run lint`를 다시 실행해 baseline을 확인한다.

권장 방향:

1. 최신 `develop` 기준 `npm run lint` 통과 여부를 확인한다.
2. `tmp/**` 전체 ignore가 너무 넓은지 검토한다.
3. 필요하면 `tmp/chrome-ops-capture/**`, `tmp/ops-capture/**`처럼 좁은 ignore로 조정한다.
4. 이후 lint/typecheck/build를 baseline 검증으로 유지한다.

미확인:

- 해당 tmp 파일들이 의도적으로 repo에 남겨진 fixture인지 여부.
- `tmp/**` 전체 ignore가 장기 정책으로 적절한지 여부.

## 검증 계획

가능한 검증:

```bash
npm run typecheck
npm run lint
npm run build
```

환경 필요 검증:

```bash
npm run ops:doctor
npm run ops:source-sync
npm run ops:worker:once
```

환경 필요 검증은 Supabase/Mac mini worker 설정이 확인된 세션에서 실행한다. secret 값은 문서에 기록하지 않는다.

## 남은 미정 사항

- `tmp/**` lint ignore 범위.
- build 시 `ops:sync-github`가 `data/ops/github-cache.json`을 바꾸는 운영 방식.
- Project canvas persistence 위치.
- Agent run 실제 실행 전 승인 정책.
- Portfolio project-specific map과 aistudy vault-wide map의 경계.
- aistudy issue inbox 수집 결과를 Portfolio `/ops`에서 다시 표시할지 여부.

## 민감정보 점검

이 작업 로그에는 secret 값, token, API key, access code, cookie 값, 개인정보를 기록하지 않았다.
