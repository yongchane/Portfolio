# 최신 Portfolio /ops Handoff

갱신일: 2026-06-08
브랜치: `develop`
상태: active
문서 수집 단계: `planning-and-roadmap`

## 현재 목표

Portfolio `/ops` 개발 맥락을 이어받고, 2단계 `planning-and-roadmap` 문서 수집을 통해 다음 기능, 우선순위, 작업 계획, 미정 사항을 정리한다.

## 관찰한 레포 상태

- 브랜치: `develop`
- 원격 상태: 작업 시작 시 `origin/develop`보다 3 commit 뒤처져 있었으나, 이후 사용자의 요청으로 최신 `develop`을 fast-forward로 반영했다.
- 최근 확인 commit: `376ef7d 새 노드 추가 기능`
- 이번 문서 작업 전 기존 dirty file: `package-lock.json`
- `package-lock.json` diff는 여러 package entry의 `peer` marker 제거이며, 이번 문서 작업에서 만든 변경이 아니다.
- 사용자가 명시하기 전에는 merge/rebase를 수행하지 않았다. 이후 `git pull --rebase`를 적용했고, 결과는 fast-forward였다.

## 현재 /ops 상태

`/ops`는 Portfolio 앱 내부의 private 운영 콘솔이다. 현재 확인된 구현 경로는 다음과 같다.

- Supabase-first runtime data loading과 local fallback.
- project/task/note/worklog/artifact sync.
- `/api/ops/ingest`를 통한 DB-first structured ingest.
- Obsidian-compatible markdown worklog mirror.
- GitHub read-only cache.
- Mac mini watcher automation.
- Supabase로 상태를 push하는 Mac mini worker bridge.
- OpenClaw/Aeyong 운영 상태 surface.
- repository browser와 project canvas를 포함한 project management view.

## 문서 수집 1단계 산출물

- `docs/00_Start_Here.md`
- `docs/01_Project_Overview/project-onboarding.md`
- `docs/02_Architecture/ops-system-map.md`
- `docs/03_Development/ops-commands.md`
- `docs/07_Handoffs/00_Latest_Handoff.md`
- `docs/08_AI_Workflow/aistudy-skill-validation.md`

## 이번 문서 수집 2단계 산출물

- `docs/04_Features/ops-dashboard-spec.md`
- `docs/04_Features/obsidian-visualization-spec.md`
- `docs/06_Work_Log/2026-06-08_planning-and-roadmap.md`
- `docs/07_Handoffs/00_Latest_Handoff.md`

## `/ops` 다음 우선순위

1. P0: 최신 `develop` 기준 검증 baseline을 재확인한다.
2. P1: Supabase-first production data trust와 Mac mini worker heartbeat/status를 검증한다.
3. P1: Project Mission Control을 health score, action queue, AI Review Board v2 중심으로 정착시킨다.
4. P1: Docs/Vault 작업 도서관을 bucket, orphan action, artifact timeline 중심으로 고도화한다.
5. P2: Floating Agent Panel과 agent run queue/approval/result 기록을 연결한다.
6. P2: GitHub read-only cache freshness와 CI/security/release signal을 운영 판단에 반영한다.
7. P3: Docker/Nginx/network/실시간 chat/배포 자동 제어는 후순위로 유지한다.

## 함께 읽을 기존 문서

- `README.md`
- `docs/ops-supabase-sync.md`
- `docs/ops-ai-worklog-mvp.md`
- `docs/ops-automation-mac-mini.md`
- `docs/ops-mac-mini-worker.md`
- `docs/ops/personal-os-renewal-spec.md`
- `docs/plans/*.md`

## 알려진 불일치

aistudy handoff는 `docs/ops-codex-handoff.md`를 참조한다. 원격 최신 `develop`을 반영한 뒤 현재 작업트리에는 해당 파일이 존재한다. 문서 수집 단계의 최신 요약은 이 파일이고, 기존 `/ops` 구현 handoff는 `docs/ops-codex-handoff.md`도 함께 읽는다.

## 다음 작업

1. 최신 `develop` 기준 `npm run lint`, `npm run typecheck`, `npm run build` baseline을 재확인한다.
2. Supabase와 Mac mini worker 환경이 준비된 상태에서 `ops:doctor`, `ops:source-sync`, `ops:worker:once`를 검증한다.
3. Portfolio 전용 project map/canvas 작업을 vault-wide aistudy map과 분리해서 이어간다.
4. 의미 있는 Portfolio 작업 후에는 `yc-pj-status-send` 흐름으로 `yongchane/aistudy` issue inbox에 상태보고를 남긴다.
5. build 시 `ops:sync-github`가 `data/ops/github-cache.json`을 변경하는 운영 정책을 결정한다.

## 민감정보 점검

이 handoff에는 secret 값, API key, token, access code, cookie 값, 개인정보를 기록하지 않는다.
