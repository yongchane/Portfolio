# /ops Overview v2 Design — Action Command Center

작성일: 2026-05-09
대상 브랜치: `develop`
대상 페이지: `/ops` Overview

## 1. 목표

기존 `/ops` Overview를 단순 상태 모음/시냅스 지도에서 **오늘 처리할 운영 액션을 알려주는 Action Command Center**로 재설계한다.

핵심 변화:

```text
raw data dashboard
→ decision model dashboard
```

즉, GitHub/노트/worker 상태를 많이 보여주는 화면이 아니라, 사용자가 들어오자마자 다음 질문에 답할 수 있어야 한다.

> 지금 내가 뭘 처리해야 하지?

## 2. 사용자 선호 / UI 원칙

사용자 선호:

- 간단하고 직관적인 UI
- 정보량이 많아도 컴포넌트별 구분이 명확해야 함
- 중요한 내용은 강하게 강조되어야 함
- 관계 파악이 중요할 때는 그래프/시냅스/Obsidian-like 연결 UI 선호
- 작업 처리/판단은 카드형 UI가 더 적합

디자인 원칙:

1. 정보보다 액션 우선
2. GitHub는 중심이 아니라 근거 데이터
3. Worker/Mac mini는 상태보다 복구 가능성 중심
4. Docs/Vault는 목록보다 CMS coverage 중심
5. AI는 장식이 아니라 실행/승인/review queue로 표현
6. 모든 숫자는 클릭 가능한 운영 단서여야 함
7. 실데이터 여부를 숨기지 않음

## 3. 기존 IA

```text
Overview
├─ Hero: 오늘의 운영 시냅스
├─ Synapse topology
│  ├─ Projects
│  ├─ Tasks
│  ├─ Docs/Vault
│  ├─ Aeyong
│  ├─ Worker
│  ├─ Mac mini
│  ├─ GitHub
│  └─ Releases
├─ Summary metrics
├─ 사용자 판단 필요
├─ 최근 synced 노트
├─ Recent AI work
├─ Recent typed artifacts
├─ Data source verification
├─ Vault operating signals
└─ GitHub 연결 현황
```

문제:

- 정보는 많지만 우선순위가 약함
- 사용자가 직접 해석해야 함
- GitHub/노트 상태판처럼 보임
- 관리자 페이지/CMS의 핵심인 생성·검증·승인·복구 액션이 약함

## 4. 새 IA

```text
Overview v2 — Action Command Center

1. Command Header
   - 오늘의 상태 요약
   - 전체 위험도 / 안정도
   - 가장 중요한 next action
   - primary CTA 1개
   - compact source freshness

2. Today Action Queue
   - 승인 대기
   - 검증 필요
   - blocked
   - stale/recovery
   - AI review 필요
   - docs/worklog 누락

3. Project Operating Radar
   - 프로젝트별 health
   - next action
   - risk source
   - linked tasks/docs/github/review

4. System Health Strip
   - Worker
   - Mac mini
   - OpenClaw
   - Supabase
   - GitHub

5. Knowledge / CMS Snapshot
   - docs coverage
   - recent docs
   - missing buckets
   - orphan notes
   - worklog/artifact status

6. Recent Operations Timeline
   - sync requests
   - agent runs
   - worker heartbeat
   - task/project updates
   - worklogs/releases when available

7. Data Trust Footer
   - active source
   - freshness
   - table health
   - empty data warnings
```

## 5. IA 변화 요약

| 영역 | 기존 Overview | 새 Overview |
|---|---|---|
| 첫 인상 | 시냅스 대시보드 | 오늘의 운영 커맨드센터 |
| 중심 질문 | 전체 상태가 어떻지? | 지금 뭘 처리해야 하지? |
| 정보 구조 | Projects/Tasks/Docs/GitHub 병렬 노출 | Action Queue 중심 |
| GitHub 역할 | 주요 카드 중 하나 | 근거 데이터/보조 신호 |
| Worker/Mac mini | 별도 상태 노드 | 복구 필요 여부 중심 |
| Docs/Vault | 최근 노트/태그 표시 | CMS 누락/정리 필요 표시 |
| AI | worklog/artifact 표시 | 실행/승인/리뷰 필요 작업 표시 |
| 사용자 행동 | 클릭해서 탐색 | 바로 처리/요청/검증 |
| 관리자 페이지 느낌 | 약함 | 강함 |
| CMS 느낌 | 문서 라이브러리 일부 | 콘텐츠 상태/누락/발행 준비 관리 |

## 6. 디자인 시스템

### 6.1 전체 방향

```text
Simple Command Center
+ Card-based CMS
+ Lightweight Synapse
+ Action-first Admin
```

- 그래프는 보조
- 액션은 카드 중심
- 상태는 색상과 라벨로 즉시 인지
- CTA는 카드당 1개를 원칙으로 함

### 6.2 카드 계층

#### Level 1 — Command Card

사용 위치:

- Command Header
- Today Action Queue 주요 카드

역할:

- 오늘의 결론
- 가장 중요한 next action
- primary CTA

#### Level 2 — Operating Card

사용 위치:

- Project Radar
- System Health
- Knowledge Snapshot

역할:

- 상태
- 판단
- 근거 2~3개
- 작은 CTA

#### Level 3 — Evidence Card

사용 위치:

- Recent Operations Timeline
- Data Trust Footer

역할:

- 근거
- 로그
- source/freshness

### 6.3 상태 색상

| 상태 | 색 | 의미 |
|---|---|---|
| critical/error/blocked | rose | 지금 막힘 |
| warning/verifying/stale | amber | 주의/검증 필요 |
| info/monitoring | cyan | 관찰/안내 |
| healthy/completed/online | emerald | 정상/완료 |
| empty/unknown | slate | 데이터 없음/불명 |
| AI/review | violet | AI 리뷰/에이전트 |

## 7. 컴포넌트 설계

### 7.1 `CommandHeader`

역할:

> 오늘의 전체 상태와 가장 중요한 next action 표시.

구성:

```text
CommandHeader
├─ status badge
├─ title
├─ one-line diagnosis
├─ primary next action
├─ primary CTA
└─ compact source freshness
```

### 7.2 `ActionQueue`

역할:

> 오늘 처리해야 할 운영 액션 목록.

구성:

```text
ActionQueue
├─ category chips
│  ├─ All
│  ├─ Approval
│  ├─ Verify
│  ├─ Blocked
│  ├─ Recovery
│  └─ Review
└─ ActionItem[]
```

`ActionItem`:

```text
- severity
- category
- title
- reason
- source table/id
- target page/id
- CTA
```

### 7.3 `ProjectRadar`

역할:

> 프로젝트별 운영 위험과 다음 액션.

각 프로젝트 카드:

```text
- project name
- stage
- health status/score
- diagnosis
- next action
- open/verifying/blocked task count
- docs coverage
- ai review coverage
- github risk summary
- CTA
```

GitHub는 상단 주인공이 아니라 하단 evidence chip으로만 표시한다.

### 7.4 `SystemHealthStrip`

역할:

> 시스템 이상 여부를 빠르게 판단.

구성:

```text
Worker | Mac mini | OpenClaw | Supabase | GitHub
```

각 item:

```text
- status dot
- label
- detail
- last seen
- target section
```

### 7.5 `KnowledgeSnapshot`

역할:

> CMS/문서 운영 상태 확인.

구성:

```text
- docs coverage
- missing buckets
- recent docs
- worklog/artifact empty state
```

버킷:

```text
기능명세서
AARRR
IA/User Flow
AI 활용 기록
OpenClaw 세팅 기록
프로젝트 회고
작업 로그
결정 기록
레퍼런스 분석
```

### 7.6 `OperationsTimeline`

역할:

> 최근 시스템 활동을 시간순으로 보여줌.

초기 source:

```text
ops_sync_requests
ops_agent_runs
ops_worker_heartbeats
ops_tasks.updated_at
ops_projects.updated_at
ops_ai_reviews.updated_at
github releases
ops_worklogs.updated_at
```

### 7.7 `DataTrustFooter`

역할:

> 이 화면이 진짜 DB/API 값인지 신뢰를 줌.

구성:

```text
- active source
- last generated
- table counts/status
- empty-but-expected tables
- known warnings
```

## 8. API / 데이터 설계

### 8.1 신규 API

```http
GET /api/ops/overview
```

역할:

> Overview 화면에 필요한 운영 판단 모델을 한 번에 반환한다.

기존 상세 API들은 유지한다.

```text
기존 API = 상세 페이지/개별 기능용
overview API = 홈 화면 summary/decision용
```

### 8.2 서버 helper

```text
lib/ops/overview.ts
├─ buildOpsOverviewModel(data)
├─ buildCommand(data)
├─ buildActionQueue(data)
├─ buildProjectHealth(data)
├─ buildSystemHealth(data)
├─ buildKnowledgeSnapshot(data)
├─ buildOperationsTimeline(data)
└─ buildDataTrust(data)
```

### 8.3 응답 모델

```ts
type OpsOverviewResponse = {
  generatedAt: string;
  source: {
    mode: "supabase" | "local";
    supabaseReachable: boolean;
    freshness: "fresh" | "stale" | "unknown";
    warnings: string[];
  };
  command: OverviewCommand;
  actions: OverviewActionItem[];
  projects: OverviewProjectHealth[];
  system: OverviewSystemHealth;
  knowledge: OverviewKnowledgeSnapshot;
  timeline: OverviewTimelineItem[];
  dataTrust: OverviewDataTrust;
};
```

### 8.4 새 테이블 여부

초기 구현에서는 새 테이블을 추가하지 않는다.

기존 테이블로 충분히 계산 가능하다.

```text
ops_projects
ops_tasks
ops_notes
ops_worker_heartbeats
ops_host_status
ops_openclaw_status
ops_sync_requests
ops_agents
ops_agent_runs
ops_ai_reviews
ops_worklogs
ops_artifacts
```

나중에 사용자가 action dismiss/resolve를 원하면 그때 `ops_action_items`를 검토한다.

## 9. 검증 기준

### 9.1 화면 검증

- `/ops` Overview 진입 시 Command Header가 첫 화면에 보여야 함
- Today Action Queue가 Summary metrics보다 위에 있어야 함
- GitHub 정보가 화면의 주인공처럼 보이면 실패
- 각 카드에는 status/diagnosis/CTA가 명확해야 함
- 빈 데이터는 숨기지 않고 empty state로 보여야 함
- 모바일 폭에서도 Action Queue가 먼저 보여야 함

### 9.2 API/DB 검증

- `GET /api/ops/overview`가 인증 후 성공해야 함
- 응답에 `command/actions/projects/system/knowledge/timeline/dataTrust`가 모두 있어야 함
- Supabase row count가 실제 DB와 일치해야 함
- `ops_worklogs`, `ops_artifacts`, `ops_ai_reviews`가 0개면 Data Trust와 Knowledge Snapshot에 명시되어야 함
- `agent_runs.status = needs_approval`이면 Action Queue에 승인 대기 항목이 생겨야 함
- `tasks.status = verifying`이면 Action Queue에 검증 필요 항목이 생겨야 함

### 9.3 빌드/품질 검증

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 브라우저 QA: 9개 sidebar page 진입 가능
- Overview hydration error 없음
- API smoke: `/api/ops/overview`

## 10. 구현 범위

### MVP 포함

- `lib/ops/overview.ts`
- `app/api/ops/overview/route.ts`
- Overview v2 UI 컴포넌트
- Action Queue derived items
- Project Radar derived health
- System Health Strip
- Knowledge Snapshot
- Timeline
- Data Trust Footer

### MVP 제외

- 새 `ops_action_items` 테이블
- action dismiss/resolve persistence
- 실제 Agent run execution wiring
- AI Review 자동 생성 pipeline
- WebSocket/real-time streaming
- 복잡한 graph canvas/D3/React Flow

## 11. 구현 순서 초안

1. Overview model type 정의
2. `lib/ops/overview.ts` helper 작성
3. `/api/ops/overview` route 추가
4. OverviewSection을 model-driven UI로 재구성
5. 기존 Summary/Synapse UI를 action-first 구조로 재배치 또는 축소
6. API smoke 테스트
7. 브라우저 QA
8. typecheck/lint/build

## 12. 성공 판정

이 작업이 성공하면 Overview는 다음처럼 느껴져야 한다.

```text
기존: GitHub/노트/상태 정보를 모아둔 예쁜 대시보드
변경: 오늘 처리할 운영 액션을 알려주는 개인 관리자/CMS 홈
```

사용자가 `/ops`에 들어와서 10초 안에 알 수 있어야 한다.

1. 지금 가장 중요한 일이 무엇인지
2. 어떤 프로젝트가 위험한지
3. 시스템은 정상인지
4. 문서/기록이 누락됐는지
5. 데이터가 Supabase 실데이터인지
