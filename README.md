# Frontend Developer Portfolio

포트폴리오 웹사이트입니다.

## 프로젝트 개요

- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성과 개발 생산성
- **Tailwind CSS v4** - 유틸리티 우선 CSS 프레임워크
- **Framer Motion** - 부드러운 애니메이션과 인터랙션
- **Geist Font** - 깔끔한 타이포그래피

## 주요 특징

### 토스 스타일 디자인
- 단순하고 직관적인 UI
- 의미있는 마이크로 인터랙션
- 명확한 타이포그래피와 여백
- 60fps 부드러운 애니메이션

### 페이지 구성
1. **Hero Section** - 임팩트 있는 인트로와 CTA
2. **About** - 간결한 자기소개
3. **Tech Stack** - 인터랙티브 기술 스택 시각화
4. **Projects** - 주요 프로젝트 3개 (확장 가능한 아코디언 형태)
5. **Contact** - 연락처 및 소셜 링크

## 시작하기

### 개발 서버 실행

```bash
npm install
npm run dev
```

### /ops 노트 자동 연동

`/ops`는 로컬에서 Obsidian/문서 루트를 직접 읽을 수 있으면 live mode로 동작하고, 변경을 주기적으로 감지해 자동 새로고침합니다. 배포/빌드에서는 export JSON을 사용합니다.

Supabase 기반으로 옮기려면 `docs/ops-supabase-sync.md`와 `supabase/ops-schema.sql`을 사용하세요. 현재는 **local/export fallback 유지 + Supabase optional** 구조입니다.

기본 탐색 경로:
- `PORTFOLIO_OPS_WORKSPACE_ROOT/obsidian-vault`
- `PORTFOLIO_OPS_WORKSPACE_ROOT/docs`
- 미설정 시 `~/.openclaw/workspace`

```bash
# 예: 외부 Obsidian 워크스페이스를 직접 연결
export PORTFOLIO_OPS_WORKSPACE_ROOT=/absolute/path/to/your/workspace
npm run dev

# 선택: export 파일도 자동 갱신하고 싶으면 watcher 실행
npm run ops:watch-notes
```

특정 루트만 지정하고 싶다면 `PORTFOLIO_OPS_NOTE_ROOTS`에 경로 구분자(`:` on macOS/Linux)로 여러 경로를 넘길 수 있습니다.

### 빌드

```bash
npm run build
npm run start
```

> `npm run build`는 배포용 snapshot을 맞추기 위해 먼저 `npm run ops:sync-notes`를 실행합니다.

### 린트

```bash
npm run lint
```

## 커스터마이징 가이드

### 1. 개인 정보 수정

각 컴포넌트 파일에서 샘플 데이터를 본인의 정보로 교체하세요:

- `components/Hero.tsx` - 메인 타이틀과 소개
- `components/About.tsx` - 자기소개
- `components/TechStack.tsx` - 기술 스택 및 숙련도
- `components/Projects.tsx` - 프로젝트 정보
- `components/Contact.tsx` - 이메일, GitHub, LinkedIn 링크

### 2. 색상 커스터마이징

`app/globals.css`의 CSS 변수를 수정하여 색상 팔레트를 변경할 수 있습니다:

```css
:root {
  --primary: #3182f6;
  --primary-hover: #1b64da;
  --accent: #0064ff;
  /* ... */
}
```

### 3. 프로젝트 추가

`components/Projects.tsx`의 `projects` 배열에 새로운 프로젝트를 추가하세요:

```typescript
const projects: Project[] = [
  {
    id: '1',
    title: '프로젝트 제목',
    description: '프로젝트 설명',
    role: '역할',
    period: '기간',
    tags: ['태그1', '태그2'],
    achievements: ['성과1', '성과2'],
    link: 'https://...',
    github: 'https://github.com/...',
  },
  // 더 많은 프로젝트 추가...
];
```

## 프로젝트 구조

```
portfolio/
├── app/
│   ├── globals.css        # 글로벌 스타일 및 디자인 시스템
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/
│   ├── Navigation.tsx     # 네비게이션 바
│   ├── Hero.tsx           # 히어로 섹션
│   ├── About.tsx          # 소개 섹션
│   ├── TechStack.tsx      # 기술 스택 섹션
│   ├── Projects.tsx       # 프로젝트 섹션
│   └── Contact.tsx        # 연락처 섹션
├── types/
│   └── index.ts           # TypeScript 타입 정의
└── public/                # 정적 파일
```

## 기술적 하이라이트

- **성능 최적화**: Framer Motion의 `viewport` 옵션으로 스크롤 애니메이션 최적화
- **타입 안전성**: 모든 컴포넌트와 데이터에 TypeScript 타입 적용
- **접근성**: 시맨틱 HTML과 ARIA 속성 사용
- **반응형 디자인**: 모바일부터 데스크톱까지 일관된 경험
- **SEO**: Next.js의 메타데이터 API로 검색 엔진 최적화

## 배포

### Vercel (권장)
```bash
# GitHub 연동 후 자동 배포
vercel --prod
```

### 기타 플랫폼
- Netlify
- AWS Amplify
- Cloudflare Pages

## 라이선스

MIT License - 자유롭게 수정하고 사용하세요.

## 문의

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 등록해주세요.
