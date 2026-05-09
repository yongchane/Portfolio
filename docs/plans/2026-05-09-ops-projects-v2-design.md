# /ops Projects v2 Design — Project Mission Control

작성일: 2026-05-09
대상 브랜치: `develop`
대상 페이지: `/ops` Projects

## 1. 목표

기존 `/ops` Projects를 단순 프로젝트 상세/편집 화면에서 **프로젝트별 운영 의사결정 화면(Project Mission Control)**으로 재설계한다.

핵심 변화:

```text
project detail dashboard
→ project decision + review command screen
```

Projects에 들어왔을 때 사용자는 다음 질문에 바로 답할 수 있어야 한다.

> 이 프로젝트는 지금 안전하게 앞으로 가고 있나? 아니면 무엇을 먼저 처리해야 하나?

## 2. 사용자 선호 / UI 원칙

사용자 선호:

- 간단하고 직관적인 UI
- 정보량이 많아도 컴포넌트/카드별 구분이 명확해야 함
- 중요한 내용은 강하게 강조되어야 함
- 관계 파악보다 액션 판단이 중요한 페이지이므로 카드형 UI 우선
- AI Review Board는 QA/security/feature/update/UIUX 관점이 명확해야 함

디자인 원칙:

1. 프로젝트 선택 즉시 상태 결론을 보여준다.
2. stage/checklist/task/GitHub/docs/AI review를 각각 보여주는 데서 끝내지 않고 하나의 판단 모델로 묶는다.
3. AI review는 장식성 코멘트가 아니라 운영 액션 후보로 취급한다.
4. GitHub/Docs/Tasks는 프로젝트 판단의 근거 데이터로 배치한다.
5. 비어 있는 데이터는 숨기지 않고 “요청/연결 필요” 상태로 드러낸다.
6. 저장/수정 기능은 유지하되, 첫 화면 중심은 편집 폼이 아니라 운영 판단이다.

## 3. 기존 Projects 구조

```text
Projects
├─ Header
├─ Project selector rail
├─ Project summary/detail
├─ Info tiles
├─ Project save behavior
├─ Spec checklist
├─ Execution snapshot
├─ Sector progress
├─ Operating cadence
├─ Admin surfaces
├─ AI Review Board
├─ Connected tasks
└─ GitHub repo / project layer
   ├─ repo detail
   ├─ CI/security
   ├─ GitHub focus
   ├─ project boards
   ├─ release signal
   └─ linked vault notes
```

문제:

- 정보는 풍부하지만 우선순위가 약하다.
- 프로젝트별 risk/health/next action을 한 번에 판단하는 모델이 없다.
- AI Review Board가 단순 5열 목록이라 severity/open/recommendation이 운영 액션으로 연결되지 않는다.
- 프로젝트 선택 rail이 단순 목록이라 위험 프로젝트 우선순위가 약하다.
- 편집 폼이 상단에 있어 “운영 지휘 화면”보다 “관리 폼” 느낌이 강하다.

## 4. 새 IA

```text
Projects v2 — Project Mission Control

1. Project Selector Rail
   - 프로젝트별 health/status/blocked/review count
   - risk/attention 프로젝트 강조
   - repo/stage/source hint

2. Project Command Header
   - 현재 프로젝트 상태 결론
   - health score
   - 가장 중요한 next action
   - stage/repo/deploy/source freshness
   - primary CTA 1개

3. Project Action Queue
   - blocked task
   - verifying task
   - high/medium AI review
   - failed CI/security alert
   - missing docs/release signal
   - missing review category

4. AI Review Board v2
   - QA / Security / Feature / Update / UI/UX
   - category별 open/resolved/ignored count
   - severity 강조
   - recommendation을 action처럼 표시
   - 리뷰가 없으면 “요청 필요” empty state

5. Execution + Docs + GitHub Evidence
   - task snapshot
   - checklist / sector progress
   - linked docs/vault notes
   - CI/security/release/project board
   - admin surfaces / cadence

6. Project Edit + Data Trust
   - stage/summary/checklist quick edit
   - active source: supabase/local
   - review/task/docs/github freshness
   - empty data warnings
```

## 5. IA 변화 요약

| 영역 | 기존 Projects | Projects v2 |
|---|---|---|
| 첫 인상 | 프로젝트 상세/관리 폼 | Project Mission Control |
| 중심 질문 | 프로젝트 정보가 뭐지? | 지금 이 프로젝트에서 뭘 처리해야 하지? |
| 프로젝트 목록 | 단순 선택 | health/risk 기반 selector |
| AI Review | 5열 코멘트 목록 | 운영 액션/리스크 보드 |
| GitHub | 상세 정보 블록 | CI/security/release 근거 데이터 |
| Docs/Vault | 연결 노트 목록 | coverage/근거/누락 신호 |
| 편집 | 상단 주요 영역 | 하단 quick edit / 관리 영역 |
| 데이터 공백 | 빈 상태 문구 | 요청/연결 필요 signal |

## 6. Decision Model

Projects v2는 UI 내부에서 직접 산발적으로 계산하지 않고 전용 builder를 둔다.

후보 파일:

```text
lib/ops/projects.ts
```

핵심 함수:

```ts
buildOpsProjectModel(data, selectedProject)
```

반환 모델 초안:

```ts
ProjectCommandModel
├─ generatedAt
├─ selectedProject
├─ command
│  ├─ status: healthy | attention | risk
│  ├─ title
│  ├─ summary
│  ├─ primaryAction
│  └─ stats
├─ projectRail
│  └─ project cards with health/risk counts
├─ actions
│  └─ blocked/verifying/review/github/docs/release items
├─ aiReviewBoard
│  └─ category columns with counts, top reviews, missing state
├─ execution
│  └─ tasks/checklist/sector/next actions
├─ evidence
│  ├─ docs
│  ├─ github
│  ├─ release
│  └─ admin surfaces
└─ dataTrust
   ├─ activeSource
   ├─ generatedAt
   ├─ counts
   └─ warnings
```

## 7. Health / Risk Rules

### 7.1 Project health score

초기 점수는 100점에서 감점한다.

감점 후보:

- blocked task 있음: -30
- verifying task 있음: -12
- high AI review open: -20
- medium AI review open: -10
- 필수 AI review category 누락: category당 -5
- failed/cancelled workflow run 있음: -15
- open security alert 있음: -25
- linked docs 없음: -10
- repo 연결 없음: -8
- live/verifying인데 release 없음: -8

상태:

```text
score < 60  → risk
score < 85  → attention
else        → healthy
```

### 7.2 Action priority

우선순위:

1. security alert / failed CI
2. blocked task
3. high AI review
4. verifying task
5. missing required AI review category
6. docs/release/repo 누락
7. normal maintenance

## 8. Component Design

### 8.1 `ProjectSelectorRail`

역할:

- 프로젝트 선택
- 프로젝트별 health/status/count 표시
- risk 프로젝트를 눈에 띄게 표시

표시:

- project name
- stage
- health pill
- blocked/verifying/review count
- repo hint

### 8.2 `ProjectCommandHeader`

역할:

- 선택 프로젝트의 전체 결론 표시

표시:

- status pill
- title
- summary
- health score
- primary CTA
- repo/deploy/source compact meta

### 8.3 `ProjectActionQueue`

역할:

- 지금 처리해야 할 항목 목록

카테고리:

- `blocked`
- `verification`
- `review`
- `security`
- `ci`
- `docs`
- `release`
- `setup`

각 카드:

- severity
- title
- reason
- evidence source
- CTA

### 8.4 `AiReviewBoardV2`

역할:

- QA/Security/Feature/Update/UIUX 리뷰 상태와 액션 후보 표시

각 category column:

- category title/helper
- open/resolved/ignored count
- highest severity pill
- top 2~3 review cards
- recommendation 강조
- missing state: “리뷰 요청 필요”

MVP에서는 실제 agent run 생성 버튼은 Floating Agent Panel과 연결 예정 문구로 둔다. 이미 `POST /api/ops/agent-runs`가 있으므로 후속 작업에서 category 기반 prompt preset 연결이 가능하다.

### 8.5 `ProjectEvidenceGrid`

역할:

- 운영 판단의 근거 데이터를 섹션별로 정리

하위 영역:

- Execution: tasks/checklist/sector/next actions
- Docs/Vault: linked notes/docs coverage
- GitHub: CI/security/repo health/project boards
- Release/Admin: release signal/admin surfaces/cadence

### 8.6 `ProjectEditAndTrust`

역할:

- 기존 stage/summary/checklist 저장 기능 유지
- source/data trust 명시

편집 기능은 유지하되 페이지 상단의 주인공은 아니게 한다.

## 9. Data Flow

```text
OpsConsoleData
  ├─ projects
  ├─ tasks
  ├─ notes/vault
  ├─ github cache
  ├─ aiReviews
  ├─ agents/agentRuns
  └─ dataSource
        │
        ▼
lib/ops/projects.ts
  buildOpsProjectModel(data, selectedProject)
        │
        ▼
ProjectsSection.tsx
  ProjectSelectorRail
  ProjectCommandHeader
  ProjectActionQueue
  AiReviewBoardV2
  ProjectEvidenceGrid
  ProjectEditAndTrust
```

## 10. Error / Empty Handling

- 프로젝트가 없으면 Projects 전체 empty state 표시
- 선택 프로젝트가 사라지면 첫 프로젝트 fallback
- AI review category가 비어 있으면 empty state를 정상 상태로 숨기지 않고 “요청 필요”로 표시
- Supabase가 unavailable이면 local/export mode 표시
- GitHub token scope 부족은 board/security 영역에서 explicit warning으로 표시
- agent execution은 아직 safe-stub/queue 기반임을 숨기지 않는다

## 11. Non-goals

이번 페이지 작업에서 하지 않는 것:

- Supabase schema 변경
- 실제 AI agent 실행 연결 완성
- 리뷰를 task로 전환하는 mutation
- project detail URL routing
- Docker/Nginx/서버 제어
- 배포/외부 발송

## 12. Success Criteria

- Projects 진입 시 선택 프로젝트의 상태/리스크/다음 액션이 즉시 보인다.
- AI Review Board가 단순 목록이 아니라 운영 액션 보드처럼 보인다.
- GitHub/Docs/Tasks가 흩어진 정보가 아니라 근거 데이터로 묶인다.
- 기존 project stage/summary/checklist 저장 기능이 유지된다.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run ops:doctor`가 통과한다.
