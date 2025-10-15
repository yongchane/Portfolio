# 포트폴리오 커스터마이징 가이드

이 문서는 포트폴리오를 본인의 정보로 커스터마이징하는 방법을 자세히 설명합니다.

## 1. 기본 정보 수정

### Hero 섹션 (`components/Hero.tsx`)

```typescript
// 라인 16: 직무 변경
<span className="text-muted text-lg font-medium">Frontend Developer</span>

// 라인 28-36: 메인 타이틀 변경
사용자 경험을
코드로 구현합니다

// 라인 44-47: 소개 문구 변경
TypeScript와 React를 활용하여 확장 가능하고 유지보수하기 쉬운
웹 애플리케이션을 만드는 프론트엔드 개발자입니다.
```

### About 섹션 (`components/About.tsx`)

```typescript
// 라인 8-30: highlights 배열 수정
const highlights = [
  {
    title: '웹 표준 준수',
    description: 'HTML, CSS, JavaScript 기본 원칙을 지키며 접근성과 성능을 고려한 개발',
  },
  // 본인의 강점으로 변경...
];

// 라인 50-64: 자기소개 내용 변경
```

### Contact 섹션 (`components/Contact.tsx`)

```typescript
// 라인 7-42: 연락처 정보 변경
const contactMethods = [
  {
    type: 'Email',
    value: 'your.email@example.com',  // 이메일 변경
    href: 'mailto:your.email@example.com',
    // ...
  },
  {
    type: 'GitHub',
    value: 'github.com/yourusername',  // GitHub 사용자명 변경
    href: 'https://github.com/yourusername',
    // ...
  },
  // LinkedIn도 동일하게 변경
];
```

## 2. 기술 스택 수정

### TechStack 섹션 (`components/TechStack.tsx`)

```typescript
// 라인 6-33: techStacks 배열 수정
const techStacks: TechStackType[] = [
  {
    category: 'Frontend',
    items: [
      {
        name: 'TypeScript',
        proficiency: 90,  // 0-100 숙련도
        experience: '2+ years'  // 경험 연차
      },
      // 본인의 기술 스택 추가/수정...
    ],
  },
  // 카테고리 추가/수정 가능
];
```

**카테고리 추가 예시:**
```typescript
{
  category: 'Backend',  // 새 카테고리
  items: [
    { name: 'Node.js', proficiency: 80, experience: '1.5+ years' },
    { name: 'Express', proficiency: 75, experience: '1+ year' },
  ],
},
```

## 3. 프로젝트 추가/수정

### Projects 섹션 (`components/Projects.tsx`)

```typescript
// 라인 7-57: projects 배열 수정
const projects: Project[] = [
  {
    id: '1',  // 고유 ID
    title: 'UI 컴포넌트 라이브러리',
    description: '프로젝트에 대한 간결한 설명 (2-3줄)',
    role: 'Frontend Developer',  // 역할
    period: '2024.01 - 2024.06',  // 기간
    tags: ['TypeScript', 'React', 'Storybook'],  // 기술 태그
    achievements: [
      '구체적인 성과 1 (수치 포함)',
      '구체적인 성과 2',
      '구체적인 성과 3',
    ],
    link: 'https://example.com',  // 프로젝트 링크 (선택)
    github: 'https://github.com/example',  // GitHub 링크 (선택)
  },
  // 프로젝트 추가...
];
```

**프로젝트 작성 팁:**
- 제목: 간결하고 명확하게
- 설명: 무엇을, 왜, 어떻게 만들었는지
- 성과: 구체적인 수치나 임팩트 포함
- 기술 태그: NHN Cloud 우대사항과 연관된 기술 강조

## 4. 색상 테마 변경

### 글로벌 스타일 (`app/globals.css`)

```css
:root {
  /* 주요 색상 변경 */
  --primary: #3182f6;        /* 주요 브랜드 색상 */
  --primary-hover: #1b64da;  /* 호버 시 색상 */
  --accent: #0064ff;         /* 강조 색상 */

  /* 배경 및 텍스트 색상 */
  --background: #ffffff;
  --foreground: #191f28;
  --secondary: #f2f4f6;
  --border: #e5e8eb;
  --muted: #6b7684;

  /* 간격 조정 */
  --spacing-section: 160px;  /* 섹션 간 간격 */
  --spacing-content: 80px;   /* 컨텐츠 간격 */
}
```

**토스 블루 유지 (권장):**
- Primary: `#3182f6` - 토스의 시그니처 블루
- 신뢰감과 전문성을 전달

**다른 색상으로 변경:**
```css
/* 예: 초록색 테마 */
--primary: #00c73c;
--primary-hover: #00b136;
--accent: #00d449;
```

## 5. 메타데이터 수정 (SEO)

### 레이아웃 파일 (`app/layout.tsx`)

```typescript
export const metadata: Metadata = {
  title: "Frontend Developer Portfolio | NHN Cloud 지원",
  description: "본인의 포트폴리오 설명",
  keywords: [
    "Frontend Developer",
    "React",
    "TypeScript",
    // 본인의 키워드 추가
  ],
  authors: [{ name: "Your Name" }],  // 이름 변경
  openGraph: {
    title: "Frontend Developer Portfolio",
    description: "TypeScript와 React를 활용한 프론트엔드 개발자",
    type: "website",
  },
};
```

## 6. 애니메이션 조정

### 애니메이션 속도 변경

각 컴포넌트의 `transition` prop을 수정:

```typescript
// 느리게
transition={{ duration: 0.8 }}

// 빠르게
transition={{ duration: 0.4 }}

// 딜레이 추가
transition={{ duration: 0.6, delay: 0.2 }}
```

### 애니메이션 비활성화

`framer-motion`의 `motion.*` 컴포넌트를 일반 HTML 태그로 변경:

```typescript
// Before
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
  Content
</motion.div>

// After (애니메이션 없음)
<div>
  Content
</div>
```

## 7. 반응형 디자인 조정

### 브레이크포인트

Tailwind CSS의 기본 브레이크포인트:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

```typescript
// 모바일: 기본 스타일
className="text-4xl"

// 태블릿 이상: md: 접두사
className="text-4xl md:text-5xl"

// 데스크톱: lg: 접두사
className="text-4xl md:text-5xl lg:text-6xl"
```

## 8. 폰트 변경

현재 Geist 폰트 사용 중. 다른 폰트로 변경하려면:

### Google Fonts 추가 (`app/layout.tsx`)

```typescript
import { Inter, Roboto } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// globals.css에서 사용
--font-sans: var(--font-inter);
```

## 9. 추가 섹션 생성

### 새 섹션 컴포넌트 만들기

1. `components/Experience.tsx` 파일 생성
2. 컴포넌트 작성
3. `app/page.tsx`에서 import 및 추가

```typescript
// app/page.tsx
import Experience from '@/components/Experience';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <About />
        <TechStack />
        <Experience />  {/* 새 섹션 추가 */}
        <Projects />
        <Contact />
      </main>
    </div>
  );
}
```

## 10. 이미지 추가

### 프로젝트 이미지

1. `public/projects/` 폴더 생성
2. 이미지 파일 추가 (예: `project-1.png`)
3. 프로젝트 데이터에 이미지 경로 추가

```typescript
const projects: Project[] = [
  {
    // ...
    image: '/projects/project-1.png',
  },
];
```

4. Projects 컴포넌트에서 이미지 렌더링 추가:

```typescript
import Image from 'next/image';

// 컴포넌트 내부
{project.image && (
  <Image
    src={project.image}
    alt={project.title}
    width={800}
    height={400}
    className="rounded-lg"
  />
)}
```

## 체크리스트

포트폴리오를 배포하기 전에 확인하세요:

- [ ] Hero 섹션의 이름과 소개 수정
- [ ] About 섹션의 자기소개 작성
- [ ] TechStack에 본인의 기술 스택 추가
- [ ] Projects에 최소 3개 프로젝트 추가
- [ ] Contact 정보 (이메일, GitHub, LinkedIn) 업데이트
- [ ] 메타데이터 (SEO) 수정
- [ ] 색상 테마가 마음에 드는지 확인
- [ ] 모바일에서 제대로 보이는지 테스트
- [ ] 모든 링크가 작동하는지 확인
- [ ] 오타 및 문법 검토

## 도움이 필요하신가요?

- Next.js 문서: https://nextjs.org/docs
- Tailwind CSS 문서: https://tailwindcss.com/docs
- Framer Motion 문서: https://www.framer.com/motion
- TypeScript 문서: https://www.typescriptlang.org/docs
