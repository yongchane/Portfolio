# /ops Personal OS Renewal Spec

작성일: 2026-05-08
대상 브랜치: `develop`
배포 전제: `hyunyongchan.kr/ops`에서 언제 어디서든 사용 가능해야 함. 로컬 Mac mini에서만 동작하는 기능은 MVP 성공으로 보지 않는다.

## 0. 목표 / 자료·상황 / 성공 기준 / 제약 / 출력 형식

### 목표
Portfolio `/ops`를 단순 관리자 페이지가 아니라 `개인 운영 콘솔 + AI 협업 관리 + Mac mini bridge + 작업 도서관`으로 재설계한다.

### 자료·상황
- 레퍼런스: `kscold-control` — 인프라/터미널/Docker/로그/토폴로지형 control tower.
- 레퍼런스: `kscold-blog-version-2` — Blog/Feed/Vault/Admin/Chat/Analytics/QA형 개인 퍼블리싱/지식관리 시스템.
- 현재 Portfolio `/ops`는 Overview/Projects/Tasks/Notes/Releases/Aeyong/Settings와 Supabase sync foundation이 이미 존재한다.
- 기존 문서: `docs/ops-supabase-sync.md`, `docs/ops-ai-worklog-mvp.md`, `docs/ops-automation-mac-mini.md`.

### 성공 기준
- 배포된 `/ops`가 Supabase를 기준으로 조회한다.
- Mac mini worker가 local Obsidian/workspace/OpenClaw/host 상태를 Supabase로 push하는 구조가 명세에 반영된다.
- Projects에 레포별 AI Review Board가 들어간다.
- Docs/Vault는 단순 노트 목록이 아니라 작업 도서관 UX로 재정의된다.
- Floating Agent Panel로 Cursor처럼 빠르게 AI Agent에 접근하는 구조가 들어간다.
- Docker/Nginx/고급 네트워크 제어는 후순위로 명시한다.

### 주의사항·제약
- `main` 브랜치 작업 금지. 모든 작업은 `develop`에서 진행.
- 삭제/배포/외부 발송/민감 설정 변경은 명시 승인 필요.
- API key는 `/ops` UI/DB에 평문 저장하지 않는다. OpenClaw/Keychain/Vault/Supabase secrets 등 서버 안전 영역으로 분리한다.
- 로컬 파일 직접 읽기 방식은 배포 환경에서 불가능하므로, production path는 반드시 `Mac mini worker -> Supabase -> deployed /ops` 구조여야 한다.
- OpenClaw cron은 LLM 토큰 소모 가능성이 있으므로 상태수집/queue polling에는 쓰지 않는다. 판단/요약/문서화에만 사용한다.

### 출력 형식
- IA
- AARRR
- User flows
- Backend architecture/spec
- Page/function checklist
- Implementation plan은 별도 `docs/plans/2026-05-08-ops-personal-os-renewal.md` 참조

---

## 1. IA

```text
/ops
├─ Overview
├─ Projects
│  ├─ Project Overview
│  ├─ Tasks
│  ├─ Docs
│  ├─ GitHub
│  └─ AI Review Board
│     ├─ QA
│     ├─ Security
│     ├─ Feature
│     ├─ Update
│     └─ UI/UX
├─ Tasks
├─ Docs / Vault
│  ├─ 기능명세서
│  ├─ IA / User Flow
│  ├─ AARRR
│  ├─ AI 활용 기록
│  ├─ OpenClaw 세팅 기록
│  ├─ 프로젝트 회고
│  ├─ 작업 로그
│  ├─ 결정 기록
│  └─ 레퍼런스 분석
├─ Aeyong / OpenClaw
├─ Worker Status
├─ Mac mini Monitor
├─ GitHub
├─ Releases
├─ Settings
└─ Floating Agent Panel
```

### MVP 포함
- Overview
- Projects + AI Review Board
- Tasks
- Docs/Vault 도서관
- Aeyong/OpenClaw
- Worker Status
- Mac mini Monitor 기본 상태
- Floating Agent Panel 기본형
- Settings

### 2차
- Agent Registry 상세
- Agent Runs 비동기 실행 카드
- GitHub read-only 강화
- Releases checklist
- QA 독립 페이지

### 후순위
- Docker 관리
- Nginx/포트/네트워크 고급 관리
- 고급 Analytics
- 실시간 Agent 채팅/스트리밍
- 배포 자동 제어

---

## 2. AARRR

### Acquisition — 진입
- 사용자는 `hyunyongchan.kr/ops`에 언제 어디서든 접속한다.
- 첫 화면에서 오늘 작업, 막힌 작업, Mac mini/worker/OpenClaw 상태를 확인한다.
- 성공 지표: 1분 안에 오늘 봐야 할 프로젝트/작업/리스크 파악.

### Activation — 첫 가치 경험
- 프로젝트 상세에서 task/docs/GitHub/AI Review가 연결되어 보인다.
- Docs/Vault에서 내가 만든 기능명세서/AARRR/AI 활용 기록을 도서관처럼 찾는다.
- Floating Agent Panel에서 현재 프로젝트 기준으로 AI 작업 요청을 생성할 수 있다.
- 성공 지표: 프로젝트 상세 진입, 문서 열람, task 상태 확인/수정, agent run 생성.

### Retention — 반복 사용
- 매일/매주 작업 상태, Aeyong worklog, worker heartbeat, sync 상태, AI review 코멘트를 보러 들어온다.
- 성공 지표: stale project 감소, 미검증 작업 감소, 문서/작업 누락 감소.

### Revenue — 가치 회수
- 직접 매출보다 시간 절약/운영 실수 감소/AI 협업 기록의 포트폴리오 증명성이 가치다.
- 장기적으로 1인 개발자/PM용 AI 운영 콘솔 SaaS로 외부화 가능.

### Referral — 확산
- 공개 포트폴리오에서 “AI를 어떻게 활용하고 프로젝트를 어떻게 운영하는지”를 보여주는 증명 자료가 된다.
- public summary/export는 후순위.

---

## 3. User Flows

### Flow 1. 오늘 운영 상태 확인
1. `/ops` 접속
2. 인증
3. Overview에서 오늘 작업/막힘/검증 필요/worker 상태 확인
4. 위험한 프로젝트 또는 task로 이동

### Flow 2. 프로젝트별 AI 리뷰 확인
1. Projects 진입
2. 프로젝트 선택
3. AI Review Board 확인
4. QA/Security/Feature/Update/UIUX 코멘트 확인
5. 필요한 코멘트를 task로 전환하거나 후속 agent run 생성

### Flow 3. 작업 도서관에서 문서 찾기
1. Docs/Vault 진입
2. 문서 타입 선택: 기능명세서/AARRR/AI 활용/OpenClaw 세팅/작업로그 등
3. 프로젝트/태그/검색으로 문서 탐색
4. 연결 task/project/agent run 확인

### Flow 4. 배포 사이트에서 Mac mini 상태 확인
1. `/ops` 접속
2. Worker Status 또는 Mac mini Monitor 확인
3. heartbeat/stale 여부 확인
4. worker offline이면 Settings의 복구 가이드 확인

### Flow 5. Floating Agent Panel로 작업 지시
1. 우측 Agent 버튼 클릭
2. Agent 선택: Aeyong Manager / QA / Security / UIUX / Docs / GitHub Review
3. 프로젝트 선택
4. 작업 요청 입력
5. `ops_agent_runs` queued 생성
6. Mac mini worker가 처리
7. `/ops`에서 결과/변경파일/검증/worklog 확인

---

## 4. Backend Architecture

### Production-first data path

```text
[Mac mini]
- OpenClaw 작업 수행
- Obsidian/workspace markdown 생성
- Host status 수집
- OpenClaw status 수집
- GitHub/cache 수집
- queued sync/agent run 처리
        │ push/upsert
        ▼
[Supabase]
- ops_worklogs
- ops_artifacts
- ops_host_status
- ops_openclaw_status
- ops_worker_heartbeats
- ops_sync_requests
- ops_agents
- ops_agent_runs
- ops_ai_reviews
        │ read
        ▼
[hyunyongchan.kr /ops]
- 언제 어디서든 조회
- 작업 관리
- 상태 확인
- sync/agent run 요청 생성
```

### 핵심 원칙
- 배포된 `/ops`는 Mac mini local markdown을 직접 읽지 않는다.
- 배포된 Next server에서 실행되는 `openclaw status`는 Mac mini 상태가 아니라 배포 서버 상태일 수 있으므로 production truth로 쓰지 않는다.
- Mac mini worker가 local 상태/파일/OpenClaw 진단 결과를 Supabase로 push한다.
- `/ops` 버튼은 local command를 실행하지 않고 Supabase queue/request row를 생성한다.
- Node worker가 주기적으로 queue를 감지한다.
- OpenClaw cron은 판단/요약/문서화에 사용하고, 단순 상태수집/queue polling에는 사용하지 않는다.
- Vercel/배포 환경의 filesystem write는 영속 workspace mirror로 신뢰하지 않는다. Obsidian markdown mirror는 Mac mini worker가 담당한다.

---

## 5. Backend Tables / API Draft

### Existing tables
- `ops_projects`
- `ops_tasks`
- `ops_notes`
- `ops_worklogs`
- `ops_artifacts`
- `ops_sync_state`
- `ops_sync_runs`

### New tables

#### `ops_worker_heartbeats`
- `id text primary key`
- `worker_name text`
- `machine text`
- `status text` — online/offline/error/stale
- `version text`
- `last_seen_at timestamptz`
- `payload jsonb`

#### `ops_host_status`
- `id uuid primary key`
- `machine text`
- `cpu jsonb`
- `memory jsonb`
- `disk jsonb`
- `uptime_seconds integer`
- `network jsonb`
- `processes jsonb`
- `created_at timestamptz`

#### `ops_openclaw_status`
- `id uuid primary key`
- `machine text`
- `gateway_status text`
- `model jsonb`
- `sessions jsonb`
- `cron jsonb`
- `issues jsonb`
- `created_at timestamptz`

#### `ops_sync_requests`
- `id uuid primary key`
- `type text` — worklogs/github/openclaw/host/all
- `status text` — queued/running/completed/failed/cancelled
- `requested_by text`
- `requested_at timestamptz`
- `started_at timestamptz`
- `finished_at timestamptz`
- `error text`
- `result jsonb`

#### `ops_agents`
- `id text primary key`
- `name text`
- `role text` — manager/qa/security/uiux/docs/github/coding
- `provider text`
- `runtime text` — openclaw/acp/codex/manual
- `model text`
- `status text`
- `permissions jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

#### `ops_agent_runs`
- `id uuid primary key`
- `agent_id text references ops_agents(id)`
- `project_id text references ops_projects(id)`
- `task_id text null`
- `status text` — queued/running/completed/failed/cancelled/needs_approval
- `prompt text`
- `scope jsonb`
- `result_summary text`
- `changed_files jsonb`
- `verification jsonb`
- `worklog_id text null`
- `created_at timestamptz`
- `started_at timestamptz`
- `finished_at timestamptz`
- `error text`

#### `ops_ai_reviews`
- `id uuid primary key`
- `project_id text references ops_projects(id)`
- `repo text`
- `category text` — qa/security/feature/update/uiux
- `agent_id text`
- `severity text` — low/medium/high/info
- `title text`
- `comment text`
- `recommendation text`
- `evidence jsonb`
- `status text` — open/resolved/ignored
- `created_at timestamptz`
- `updated_at timestamptz`

### API Draft

#### `/api/ops/sync-requests`
- `GET`: sync request 목록/상태
- `POST`: sync request 생성

#### `/api/ops/worker/status`
- `GET`: latest heartbeat + stale 판단

#### `/api/ops/host-status`
- `GET`: latest Mac mini status

#### `/api/ops/openclaw-status`
- `GET`: latest OpenClaw pushed status

#### `/api/ops/agents`
- `GET`: agent registry
- `POST`: agent 등록

#### `/api/ops/agent-runs`
- `GET`: agent run 목록
- `POST`: queued run 생성

#### `/api/ops/ai-reviews`
- `GET`: project/repo/category별 review 목록
- `POST`: worker/agent가 review 결과 저장
- `PATCH`: resolved/ignored 상태 변경

---

## 6. Mac mini Worker Spec

### 실행 주체
- Node.js worker daemon 권장.
- `launchd` 또는 `pm2`로 Mac mini 부팅/로그인 후 자동 실행.
- LLM이 필요 없는 반복 작업은 OpenClaw cron이 아니라 worker가 수행.

### 담당 모듈
1. `Queue Poller`
   - `ops_sync_requests`, `ops_agent_runs` queued row 감지.
2. `Status Collector`
   - host/OpenClaw/worker heartbeat 주기 push.
3. `Worklog Ingestor`
   - Obsidian/workspace markdown 읽고 worklogs/artifacts upsert.
4. `Agent Runner`
   - queued agent run을 OpenClaw/ACP/Codex runtime에 전달.
5. `Safety Guard`
   - main branch, 삭제, 배포, 외부 발송, 민감키 접근은 approval required.

### 기본 주기
- worker heartbeat: 15~30초
- host status: 30~60초
- OpenClaw status: 60초
- queue polling: 10~30초
- GitHub/cache refresh: 5~10분 또는 요청 기반

---

## 7. Page Feature Checklist

### Overview
- [ ] 오늘 작업/막힘/검증 필요 요약
- [ ] Worker online/stale 카드
- [ ] Mac mini 기본 상태 카드
- [ ] OpenClaw 상태 카드
- [ ] 최근 Aeyong worklogs
- [ ] 빠른 액션: sync request, agent run, project review

### Projects
- [ ] 프로젝트 목록/상세
- [ ] task/docs/github/release 연결
- [ ] AI Review Board 추가
- [ ] QA/Security/Feature/Update/UIUX 카테고리
- [ ] review 코멘트 task 전환 또는 agent run 생성

### Tasks
- [ ] 상태 관리
- [ ] 완료 근거/검증 결과 분리
- [ ] agent/worklog/review 연결

### Docs/Vault
- [ ] 도서관형 landing UI
- [ ] 기능명세서/AARRR/IA/User Flow/AI 활용/OpenClaw 세팅/작업로그/결정기록 카테고리
- [ ] 검색/태그/프로젝트 필터
- [ ] related tasks/projects/agent runs 표시

### Aeyong/OpenClaw
- [ ] 최근 작업 로그
- [ ] 변경 파일/검증/생성 문서
- [ ] latest pushed OpenClaw status
- [ ] 이슈/권장사항

### Worker Status
- [ ] latest heartbeat
- [ ] queue counts
- [ ] last sync status
- [ ] failed jobs
- [ ] stale warning

### Mac mini Monitor
- [ ] CPU/RAM/Disk/uptime
- [ ] OpenClaw gateway/process 상태
- [ ] worker process 상태
- [ ] Docker는 제외/후순위

### Floating Agent Panel
- [ ] 우측 빠른 접근 버튼
- [ ] agent 목록
- [ ] 현재 페이지/프로젝트 context 전달
- [ ] agent run 생성
- [ ] 최근 run 상태 표시

### Settings
- [ ] Supabase 연결 상태
- [ ] worker setup 상태
- [ ] OpenClaw 연결 상태
- [ ] agent 권한/보안 정책
- [ ] secrets는 표시하지 않음

---

## 8. Non-goals for MVP
- Docker 관리
- Nginx/포트포워딩/공유기 제어
- 실시간 streaming agent chat
- 자동 배포/롤백 실행
- API key를 `/ops`에 직접 저장하는 구조
- production `/ops`에서 Mac mini local file 직접 읽기
