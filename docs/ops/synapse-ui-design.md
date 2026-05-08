# /ops Synapse UI Design

작성일: 2026-05-08

## Goal

`/ops`는 표와 카드가 많은 관리자 화면이 아니라, 사용자가 한눈에 운영 상태와 연결 관계를 파악하는 **그래프/시냅스형 Personal OS**여야 한다.

## Design principles

1. **Topology first** — 프로젝트, 작업, 문서, AI, worker, Mac mini, GitHub, release가 서로 어떻게 연결되는지 먼저 보여준다.
2. **Signal before table** — 숫자 나열보다 위험/막힘/다음 행동을 먼저 강조한다.
3. **Depth on demand** — 첫 화면은 시각적 상태/관계, 클릭 후 상세 카드/목록으로 내려간다.
4. **State clarity** — online/stale/blocked/verifying/completed 상태는 색과 라벨이 명확해야 한다.
5. **Non-local truth** — production UI는 Mac mini local 직접 조회가 아니라 Supabase pushed state를 시각화한다.

## Visual language

- Background: dark neural canvas with subtle radial gradients.
- Cards: translucent glass panels with soft borders.
- Core map: central `/ops` node with radial connected nodes.
- Links: thin cyan/violet lines implying data flow.
- Alerts: amber/rose for stale/blocked/error.
- Success: emerald for online/synced/clean.

## Main surfaces

### 1. Overview
- Add Synapse Map as first visual layer.
- Nodes: Projects, Tasks, Docs/Vault, Aeyong, Worker, Mac mini, GitHub, Releases.
- Each node shows count/status and opens the corresponding section.
- Keep summary metrics, but reduce visual dominance.

### 2. Sidebar
- Make it feel like a control rail, not a plain nav list.
- Add small active indicators and route grouping later.

### 3. Projects
- AI Review Board already exists; next polish should make review categories look like diagnostic nodes.

### 4. Docs/Vault
- Library buckets already exist; next polish should make them feel like shelves/collections.

### 5. Worker/Mac mini
- Treat stale/offline as system health signal, not just rows.

## MVP implementation

- Add shared `SynapseNode`/`SynapseMap` components.
- Add visual shell gradients to `OpsConsole`.
- Add Overview synapse map above metric cards.
- Add active nav styling improvements.

## Non-goals now

- Full graph canvas library.
- Drag/drop nodes.
- Real-time WebSocket animation.
- Complex D3/React Flow dependency.
