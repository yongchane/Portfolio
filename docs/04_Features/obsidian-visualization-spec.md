# Obsidian Visualization Roadmap

갱신일: 2026-06-08
브랜치: `develop`
문서 수집 단계: `planning-and-roadmap`

## 목적

이 문서는 Portfolio `/ops`에서 Obsidian-compatible note, AI worklog, project docs, artifact를 어떻게 시각화할지 정리한다. 목표는 vault 전체를 복제하는 것이 아니라, Portfolio 프로젝트 운영에 필요한 문서 관계와 다음 행동을 보여주는 것이다.

## 범위

포함:

- Portfolio `/ops`의 Docs/Vault 작업 도서관.
- project/task/note/worklog/artifact 연결 관계.
- AI worklog, decision, learning artifact 시각화.
- project-specific map 또는 canvas 후보.
- orphan note와 coverage gap을 action signal로 표시.

제외 또는 후순위:

- aistudy 전체 vault-wide map 구현.
- 복잡한 drag/drop graph editor.
- 실시간 WebSocket graph animation.
- 민감정보가 포함된 local vault 원문 노출.

## 현재 상태 요약

확인된 사실:

- `docs/ops-ai-worklog-mvp.md`는 AI worklog markdown schema와 DB-first ingest path를 정의한다.
- `lib/ops/vault.ts`는 note folder, tag, link, orphan note summary를 만든다.
- `components/ops/sections/NotesSection.tsx`는 작업 도서관 bucket, note search, folder bucket, popular tags, orphan notes, related notes, typed artifact를 보여준다.
- `lib/ops/artifacts.ts`, `lib/ops/worklog.ts`가 typed artifact와 worklog extraction에 사용된다.
- `components/ops/project-management/ProjectCanvasPage.tsx`는 project canvas 형태의 UI가 이미 존재한다.

미확인:

- 실제 Obsidian mirror root의 production 운영 위치.
- aistudy vault와 Portfolio workspace의 양방향 sync 정책.
- project canvas node가 production DB row로 저장되는지 여부. 현재는 mock/static derived data 성격이 남아 있는 것으로 본다.

## 기능 단위 계획

### 기능 1. 작업 도서관 bucket 정교화

목적:

- 문서를 사용 목적별로 찾을 수 있게 한다.

현재 상태:

- `NotesSection`에 기능명세서, IA/User Flow, AARRR, AI 활용 기록, OpenClaw 세팅, 작업 로그, 결정 기록, 레퍼런스 분석 bucket이 있다.
- 현재 matching은 title, summary, path, type, folder, tag, heading 기반 query matching으로 보인다.

다음 작업:

- 문서 frontmatter의 `type`, `project`, `record_type`, `tags` 기반 분류 우선순위를 정한다.
- bucket별 빈 상태를 “누락 문서 생성 필요” action으로 바꾼다.
- bucket matching 규칙을 test 가능한 helper로 분리할지 검토한다.

검증 방법:

```bash
npm run typecheck
npx eslint components/ops/sections/NotesSection.tsx lib/ops/vault.ts
npm run build
```

### 기능 2. Note graph와 orphan action

목적:

- 연결되지 않은 note와 중요한 문서 관계를 운영 신호로 만든다.

현재 상태:

- `lib/ops/vault.ts`가 `linksTo`, `linkedBy`, `orphanNoteIds`를 계산한다.
- `NotesSection`이 orphan notes를 보여준다.

다음 작업:

- orphan note를 project/task/agent run에 연결할 후보로 추천한다.
- related note를 단순 목록이 아니라 “근거 문서”, “결정 문서”, “다음 작업 문서”로 구분한다.
- link graph count를 Overview knowledge snapshot과 Project Mission Control에 반영한다.

검증 방법:

```bash
npm run typecheck
npx eslint lib/ops/vault.ts components/ops/sections/NotesSection.tsx components/ops/sections/OverviewSection.tsx
```

### 기능 3. AI worklog / artifact timeline

목적:

- AI가 어떤 작업을 했고, 어떤 결정/학습/후속 작업이 남았는지 한 화면에서 추적한다.

현재 상태:

- `docs/ops-ai-worklog-mvp.md`는 `worklog`, `decision`, `learning` artifact를 정의한다.
- Overview에는 Recent Operations Timeline이 있다.
- Notes detail에는 typed artifact count와 artifact 목록이 연결되어 있다.

다음 작업:

- worklog timeline에서 검증 상태와 변경 파일을 함께 보여준다.
- artifact type별 filter를 추가한다.
- agent run 결과와 worklog note를 연결한다.

검증 방법:

```bash
npm run typecheck
npx eslint lib/ops/artifacts.ts lib/ops/worklog.ts components/ops/sections/OverviewSection.tsx components/ops/sections/NotesSection.tsx
npm run build
```

### 기능 4. Project-specific visualization

목적:

- Portfolio 안에서 특정 project의 page, feature, API, DB, docs, agent, deploy 관계를 시각화한다.

현재 상태:

- `ProjectCanvasPage`는 page/feature/API/database/deploy/docs/agent/repo node type을 가진 canvas UI를 제공한다.
- `docs/plans/2026-05-09-ops-routing-project-management-mock.md`는 project/canvas flow가 mock phase였음을 설명한다.

다음 작업:

- mock node와 실제 project/task/docs/GitHub data의 경계를 명확히 표시한다.
- canvas node 저장 위치를 결정한다.
- project detail에서 AI Review Board, GitHub evidence, docs coverage와 canvas를 연결한다.

검증 방법:

```bash
npm run typecheck
npx eslint app/ops/projects components/ops/project-management
npm run build
```

미확인:

- canvas node persistence를 Supabase table로 만들지, local JSON fallback으로 시작할지.

### 기능 5. aistudy 연동 표시

목적:

- Portfolio `/ops`가 aistudy 중앙 vault와 어떻게 연결되는지 사용자가 알 수 있게 한다.

현재 상태:

- 상태보고는 `yongchane/aistudy` GitHub Issue inbox로 전송한다.
- Issue #2에 1단계 `project-onboarding`이 수집 완료된 상태다.

다음 작업:

- `/ops` Docs/Vault에 “aistudy 수집 상태” 또는 “최근 status issue”를 표시할지 결정한다.
- Portfolio repo docs와 aistudy inbox 문서의 역할을 분리해서 안내한다.
- status issue는 최종 지식 원본이 아니라 수집 inbox라는 점을 UI나 문서에 명시한다.

검증 방법:

```bash
npm run typecheck
npm run build
```

미확인:

- aistudy GitHub Actions가 issue를 vault 문서로 변환한 결과를 Portfolio에서 다시 읽을지 여부.

## 우선순위

1. P0: 최신 `develop` 기준 검증 baseline 재확인.
2. P1: 작업 도서관 bucket과 orphan action 정리.
3. P1: AI worklog/artifact timeline 개선.
4. P2: project-specific visualization의 persistence 결정.
5. P2: aistudy 수집 상태 표시 여부 결정.

## 의사결정 필요 항목

- Portfolio `/ops`는 aistudy 전체 vault map을 보여줄 것인가, Portfolio project-specific map만 보여줄 것인가.
- project canvas node 저장소를 Supabase로 둘 것인가, local fallback JSON으로 시작할 것인가.
- orphan note 자동 연결 추천을 rule-based로 할 것인가, agent review로 할 것인가.
- issue inbox에서 수집된 aistudy 문서를 Portfolio `/ops`에서 다시 가져올 필요가 있는가.

## 민감정보 규칙

Obsidian 원문에는 민감정보가 섞일 가능성이 있으므로 `/ops` 시각화는 path, title, summary, tag, link, artifact 등 필요한 최소 정보만 사용한다. secret 값, token, API key, access code, cookie 값, 개인정보는 문서와 issue에 기록하지 않는다.
