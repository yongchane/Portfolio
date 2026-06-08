# /ops Dashboard Roadmap

갱신일: 2026-06-08
브랜치: `develop`
문서 수집 단계: `planning-and-roadmap`

## 목적

이 문서는 Portfolio `/ops` dashboard의 다음 개발 목표, 우선순위, 기능 단위 계획, 검증 방법, 미정 사항을 정리한다.

기준 문서:

- `docs/ops/personal-os-renewal-spec.md`
- `docs/ops/synapse-ui-design.md`
- `docs/plans/2026-05-09-ops-projects-v2-design.md`
- `docs/01_Project_Overview/project-onboarding.md`

## 현재 상태 요약

확인된 사실:

- `/ops`는 `app/ops/page.tsx`와 `components/ops/OpsConsole.tsx`를 통해 private 운영 콘솔을 제공한다.
- `components/ops/sections/OverviewSection.tsx`에는 오늘의 운영 커맨드, action queue, system health, project operating radar, knowledge snapshot, recent timeline이 있다.
- `lib/ops/overview.ts`는 overview model을 만드는 중심 경로로 사용된다.
- `/ops`는 Supabase-first runtime과 local fallback을 모두 고려한다.
- `components/ops/agents/FloatingAgentPanel.tsx`가 존재한다.
- `app/api/ops/agent-runs/route.ts`, `app/api/ops/agents/route.ts`, `app/api/ops/ai-reviews/route.ts`, `app/api/ops/sync-requests/route.ts`가 존재한다.

미확인:

- 배포 환경에서 실제 Supabase table 전체가 최신 schema와 일치하는지.
- Mac mini worker가 production-like 환경에서 지속적으로 heartbeat, host status, OpenClaw status를 push하고 있는지.
- Floating Agent Panel이 실제 agent execution까지 이어지는지. 현재 문서 기준으로는 safe-stub 또는 queue 중심으로 본다.

## 우선순위 요약

### P0. 검증 baseline 재확인

목적:

- 원격 최신 `develop` 반영 후 `npm run lint`, `npm run typecheck`, `npm run build`가 실제로 통과하는지 다시 확인한다.

현재 상태:

- rebase 전에는 `tmp/chrome-ops-capture/**`, `tmp/ops-capture/debug-auth.mjs`가 ESLint 범위에 포함되어 `npm run lint`가 실패했다.
- 원격 최신 `eslint.config.mjs`에는 `tmp/**` ignore가 포함되어 있다.
- 최신 기준에서는 lint baseline을 다시 실행해 통과 여부를 확인해야 한다.

다음 작업:

- 최신 `develop` 기준으로 `npm run lint`를 다시 실행한다.
- `tmp/**` ignore가 충분한지 확인한다.
- build가 `data/ops/github-cache.json`을 변경하는 운영 방식을 별도 결정한다.

검증 방법:

```bash
npm run lint
npm run typecheck
npm run build
```

결정 필요:

- `tmp/**` 전체 ignore를 유지할지, 더 좁은 capture 경로만 ignore할지.
- GitHub cache를 build 때마다 갱신하는 현재 방식을 유지할지.

### P1. Production data trust 완성

목적:

- deployed `/ops`가 Mac mini local file 직접 읽기에 의존하지 않고 Supabase pushed state를 기준으로 판단하도록 한다.

현재 상태:

- `docs/ops-supabase-sync.md` 기준으로 Supabase-first + direct workspace fallback 구조가 정리되어 있다.
- `scripts/ops-mac-mini-worker.mjs`가 `ops_worker_heartbeats`, `ops_host_status`, `ops_openclaw_status`를 push하는 경로를 갖고 있다.
- `npm run ops:doctor`가 Supabase ops table 접근성을 확인한다.

다음 작업:

- Supabase schema와 code가 기대하는 table/column 목록을 대조한다.
- Mac mini worker 1 tick 검증 결과를 문서화한다.
- `/ops` Overview에 active source, last sync, stale 여부를 더 선명하게 노출한다.

검증 방법:

```bash
npm run ops:doctor
npm run ops:worker:once
npm run ops:source-sync
npm run build
```

미확인:

- 현재 세션에는 Supabase secret 값과 production worker runtime 상태를 기록하지 않는다.
- 실제 배포 URL에서 같은 data source가 보이는지는 별도 브라우저 검증 필요.

### P1. Project Mission Control 정착

목적:

- Projects를 단순 목록/편집 화면이 아니라 프로젝트별 운영 판단 화면으로 만든다.

현재 상태:

- `app/ops/projects/**` route가 존재한다.
- `components/ops/project-management/ProjectRepositoryListPage.tsx`, `GitHubRepositoryBrowserPage.tsx`, `ProjectCanvasPage.tsx`가 존재한다.
- `docs/plans/2026-05-09-ops-projects-v2-design.md`에는 health score, action priority, AI Review Board v2 모델이 정리되어 있다.

다음 작업:

- `lib/ops/projects.ts`의 project model과 `ProjectsSection`/route page가 같은 decision model을 쓰는지 확인한다.
- health/risk/action queue 산출 규칙을 test로 고정한다.
- AI Review Board 항목을 task 전환 또는 agent run 생성 후보로 연결한다.
- GitHub CI/security/release signal을 action queue에 반영한다.

검증 방법:

```bash
npm run typecheck
npx eslint app/ops components/ops lib/ops/projects.ts
npm run build
```

미확인:

- GitHub Project board data는 token scope에 따라 비어 있을 수 있다.
- AI review row의 실제 운영 데이터 품질은 별도 확인 필요.

### P1. Docs/Vault 작업 도서관 고도화

목적:

- Docs/Vault를 단순 note list가 아니라 작업 도서관으로 만든다.

현재 상태:

- `components/ops/sections/NotesSection.tsx`에 기능명세서, IA/User Flow, AARRR, AI 활용 기록, OpenClaw 세팅, 작업 로그, 결정 기록, 레퍼런스 분석 bucket이 있다.
- `lib/ops/vault.ts`가 note folder/tag/link summary를 만든다.
- `docs/ops-ai-worklog-mvp.md`는 AI worklog와 artifact 추출 규칙을 설명한다.

다음 작업:

- note bucket matching 규칙을 문서 유형별로 더 명확히 만든다.
- project/task/agent run과 note 연결 상태를 coverage signal로 만든다.
- orphan note를 단순 목록이 아니라 연결 필요 action으로 승격한다.

검증 방법:

```bash
npm run typecheck
npx eslint components/ops/sections/NotesSection.tsx lib/ops/vault.ts
npm run build
```

### P2. Floating Agent Panel과 Agent Runs

목적:

- `/ops`에서 현재 project/context 기준으로 agent run을 요청하고 결과를 추적한다.

현재 상태:

- `components/ops/agents/FloatingAgentPanel.tsx`가 존재한다.
- agent, agent run API route가 존재한다.
- 문서 기준으로 Mac mini worker의 agent execution은 safe-stub 상태로 본다.

다음 작업:

- agent registry, run request schema, approval policy를 명확히 한다.
- 실행 전 승인/검증/결과 기록 플로우를 만든다.
- OpenClaw/ACP execution policy가 정리되기 전까지 destructive action은 막는다.

검증 방법:

```bash
npm run typecheck
npx eslint components/ops/agents app/api/ops/agent-runs app/api/ops/agents
npm run build
```

미확인:

- 실제 agent runtime 연결 정책.
- run 결과를 Obsidian-compatible worklog와 어떻게 양방향 연결할지.

### P2. GitHub read-only 강화

목적:

- GitHub repo, workflow, release, security signal을 `/ops` 판단 근거로 강화한다.

현재 상태:

- `scripts/sync-ops-github.mjs`가 GitHub cache를 생성한다.
- `npm run build`는 선행으로 `ops:sync-github`를 실행한다.
- token scope에 따라 repo/release/project board data가 달라질 수 있다.

다음 작업:

- build 과정에서 cache diff가 발생하는 운영 방식을 결정한다.
- GitHub cache freshness와 missing-scope warning을 UI에 명확히 표시한다.
- Project Mission Control의 risk score에 failed workflow/security alert를 반영한다.

검증 방법:

```bash
npm run ops:sync-github
npm run build
```

주의:

- token 값과 scope 세부 정보는 문서에 기록하지 않는다.

### P3. 후순위 기능

후순위:

- Docker 관리.
- Nginx/port/network 고급 제어.
- 고급 analytics.
- 실시간 agent chat/streaming.
- 배포 자동 제어.

근거:

- `docs/ops/personal-os-renewal-spec.md`에서 후순위로 분리되어 있다.
- 현재 핵심 성공 기준은 Supabase-first 운영 콘솔, worker bridge, 작업 도서관, project decision flow다.

## 작업 계획

### Milestone A. 검증 가능한 baseline 유지

목표:

- `npm run lint`, `npm run typecheck`, `npm run build`가 모두 통과하는 상태를 만든다.

작업:

1. 최신 `develop` 반영 후 lint/typecheck/build 재실행.
2. `tmp/**` ignore 정책이 충분한지 확인.
3. build가 `data/ops/github-cache.json`을 변경하는 방식 정리.
4. baseline 검증 결과를 `docs/06_Work_Log`에 기록.

### Milestone B. Production data trust

목표:

- 배포 `/ops`가 Supabase pushed state를 신뢰할 수 있게 만든다.

작업:

1. `ops:doctor` 결과 기록.
2. `ops:worker:once` 결과 기록.
3. Overview data trust UI 개선.
4. worker stale/offline recovery guide 보강.

### Milestone C. Project Mission Control

목표:

- 프로젝트별 다음 행동을 결정하는 화면을 완성한다.

작업:

1. project health model test 고정.
2. action queue를 blocked/verifying/review/github/docs/release signal로 통합.
3. AI Review Board v2와 task/agent run 연결.
4. GitHub evidence와 docs coverage를 판단 근거로 노출.

### Milestone D. Docs/Vault와 Obsidian visualization

목표:

- 작업 도서관과 시각화가 프로젝트 운영 판단에 연결되게 한다.

작업:

1. note bucket/type mapping 고도화.
2. orphan/link coverage action화.
3. project-specific graph/canvas 설계.
4. aistudy vault-wide map과 Portfolio project map의 경계 확정.

## 의사결정 필요 항목

- `tmp/**` 전체 ignore를 유지할지, capture artifact만 좁게 ignore할지.
- GitHub cache를 build 때마다 갱신하는 현재 방식을 유지할지.
- Project canvas를 frontend mock에서 production data model로 언제 전환할지.
- Agent run 실행 정책을 safe-stub에서 실제 실행으로 넘기는 승인 조건.
- `aistudy` vault-wide map과 Portfolio project-specific map의 소유권/표현 범위.

## 민감정보 규칙

이 문서에는 secret 값, token, API key, access code, cookie 값, 개인정보를 기록하지 않는다. 환경변수 이름과 파일/API path만 필요한 범위에서 기록한다.
