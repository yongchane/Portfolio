"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import type { Project } from "@/types";

// 샘플 프로젝트 데이터 - 실제 프로젝트로 교체하세요
const projects: Project[] = [
  {
    id: "1",
    title: "개인 포트폴리오 웹사이트 제작",
    imageUrl: "/portfolio.webp",
    description:
      "저의 개발 여정과 성과를 효과적으로 보여주기 위해 Next.js와 TypeScript를 기반으로 직접 구축한 포트폴리오 웹사이트입니다. \n 단순한 정보 나열을 넘어, 사용자 친화적인 UI/UX와 최적화된 성능을 통해 방문자가 저의 강점을 명확히 인지하도록 설계했습니다.",
    achievement:
      "- 성능 최적화: 빌드 프로세스 최적화를 통해 Lighthouse 성능 점수 95점 이상을 달성하고, 초기 로딩 번들 크기를 102KB까지 감소시켰습니다.\n\n- UI/UX 설계 및 개발: 재사용 가능한 컴포넌트 아키텍처를 설계하여 유지보수성을 높이고, Framer Motion의 whileInView 옵션으로 스크롤 애니메이션을 최적화하여 부드러운 사용자 경험을 제공했습니다.\n\n- 배포 및 운영: 직접 도메인을 구매하고 Google Search Console에 사이트맵을 등록하는 등 SEO 작업을 통해 실제 검색 엔진에 노출되는 라이브 서비스를 운영하고 있습니다.",
    role: "1인 개발 / UI UX / FE",
    period: "2025.10",
    tags: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "SEO",
      "Vercel",
    ],
    link: "https://www.hyunyongchan.kr/", // 실제 도메인 주소로 변경해주세요.
  },
  {
    id: "2",
    title: "[Vibe coding] 운빨 고양이 달리기 게임",
    imageUrl: "/runcat.webp",
    description:
      "'AI 툴로 20개 프로젝트 만들기' 챌린지의 두 번째로 작업중인 프로젝트입니다.\n 기획-디자인-개발 전 과정을 AI와 협업하여 1인 개발한 Canvas 기반 로그라이크 웹 게임입니다.\n 10 스테이지마다 주어지는 랜덤 음식을 통해 고양이가 새로운 능력치를 얻고 모습이 진화하는 독특한 컨셉으로, AI를 활용한 신속한 프로토타이핑과 개발 가능성을 탐구한 프로젝트입니다.",
    achievement:
      "- 상태 동기화 문제 해결: React UI와 Canvas 게임 로직 간의 상태 동기화 문제를 Zustand를 도입하여 100% 해결하고, 정확한 게임 일시정지 및 능력치 업데이트를 구현했습니다.\n\n- Canvas 렌더링 최적화: 다수의 객체 렌더링으로 인한 FPS 저하 문제를 '오프스크린 Canvas'와 '객체 컬링' 기법으로 해결하여, 모든 스테이지에서 안정적으로 60 FPS를 유지하도록 성능을 개선했습니다.\n\n- AI 워크플로우 구축: 기획(Perplexity), 디자인(Gemini), 개발(Copilot) 등 전 과정에 AI를 활용하여 아이디어를 빠르게 프로토타이핑하고 완성하는 새로운 개발 방식을 성공적으로 구축했습니다.",
    role: "1인 개발 / PM / Design / FE",
    period: "(진행중) 2025.09 - ",
    tags: ["TypeScript", "Next.js", "Canvas API", "Zustand", "AI Development"],
    github: "https://github.com/yongchane/CatRunner.git",
  },
  {
    id: "3",
    title: "[외주] (주) 한국 기타가와 홈페이지 리뉴얼",
    imageUrl: "/kitagawa.webp",
    description:
      " 정밀 척 및 공작기계 부품 분야의 글로벌 전문 기업인 기타가와(Kitagawa)의 한국 지사 웹사이트 개편 프로젝트를 외주로 맡아 수행중입니다. \n 노후화된 기존 사이트로 인해 현지 고객 접점이 악화된 상황에서, 한국 사용자 경험에 맞춘 PC, 모바일 반응형 웹사이트를 구축하여 브랜드 신뢰도를 강화하는 것을 목표로 하고있습니다",
    achievement:
      "- 웹 성능 683% 향상: Lighthouse 성능 점수를 12점에서 94점으로 개선하고, 초기 로딩 시간을 4.8초에서 1.0초로 단축하여 사용자 이탈률을 크게 개선했습니다.\n\n- 생산성 및 안정성 확보: 재사용 가능한 컴포넌트 아키텍처와 TypeScript를 도입하여 런타임 에러를 85% 이상 감소시키고, 향후 유지보수 비용을 절감할 수 있는 확장 가능한 구조를 마련했습니다.\n\n- 서버 상태 관리 최적화: TanStack Query의 캐싱 전략으로 불필요한 API 호출을 제거하고, 페이지 전환 없는 SPA 네비게이션을 구현하여 로딩 시간을 평균 3초에서 0초에 가깝게 단축했습니다.",
    role: "팀장 / PM / FE ",
    period: "(진행 중) 2025.08 - ",
    tags: [
      "TypeScript",
      "Next.js",
      "TanStack Query",
      "Zustand",
      "Tailwind CSS",
      "Emotion",
    ],
  },

  {
    id: "4",
    title: "[Vibe coding] 별똥별 게임",
    imageUrl: "/star.webp",
    description:
      "빠르게 발전하는 AI 툴에 적응하고, 아이디어를 실제 서비스로 완성하는 전 과정을 경험하기 위한 'AI 툴로 20개 프로젝트 만들기' 챌린지의 첫 번째 프로젝트입니다. \n Next.js와 Framer Motion을 활용하여 화려한 인터랙션을 갖춘 웹 게임을 구현했으며, 현재 실제 도메인을 연결하여 라이브 서비스를 운영하며 고도화를 진행 중입니다.",
    achievement:
      "- 초기 로딩 성능 개선: 동적 임포트(Dynamic Import)를 활용해 초기 번들 크기를 40% 감소시키고, 모바일 환경의 초기 로딩 시간을 3초 이상에서 1초 이내로 단축하여 Lighthouse 성능 점수를 92점까지 향상시켰습니다.\n\n- 상태 관리 시스템 구축: 복잡한 게임 상태로 인한 버그를 해결하기 위해 TypeScript와 Zustand를 결합한 타입-안전 전역 상태 관리 시스템을 구축하여 상태 관련 버그를 90% 이상 감소시켰습니다.\n\n- 1인 서비스 런칭: 기획, 개발뿐만 아니라 직접 도메인을 구매하고 Google SEO 작업을 완료하여, 검색 엔진에 노출되는 실제 라이브 서비스를 배포하고 운영하는 경험을 했습니다.",
    role: "1인 개발 / PM / FE",
    period: "2025.08 - 2025.09",
    tags: [
      "Next.js",
      "TypeScript",
      "Zustand",
      "Framer Motion",
      "Tailwind CSS",
      "AI Development",
      "SEO",
      "Vercel",
    ],
    link: "https://www.shootingstar.run",
    github: "https://github.com/yongchane/ShootingStar.git",
  },
  {
    id: "5",
    title:
      "[멋쟁이사자처럼13기 중앙 해커톤]TOOR - 너와 나의 투어를 잇는 토박이",
    imageUrl: "/toor.webp",
    description:
      "현지인 데이터와 AI를 통해 여행지의 가격 불투명성(바가지) 문제를 해결하는 신뢰 기반 여행 플랫폼입니다. \n GPS 기반의 현지인 인증 시스템으로 신뢰도 높은 정보를 제공하고, AI 챗봇이 개인화된 여행 가이드를 제시하여 국내 여행의 가성비를 혁신하는 것을 목표로 합니다.",
    achievement:
      "- 데이터 기반 기획: 실제 타겟층 대상 설문조사를 진행하여 얻은 데이터로 기획의 방향성을 설정하고 기능 명세서를 작성하여, 감이 아닌 데이터에 기반한 서비스를 기획하는 능력을 증명했습니다.\n\n- 개발 생산성 30% 향상: CRA의 느린 개발 서버 문제를 해결하기 위해 Vite 마이그레이션을 주도하여, 개발 서버 구동 시간을 30초에서 2초로 단축하고 팀 전체의 개발 효율을 높였습니다.\n\n- 초기 로딩 성능 60% 개선: React Lazy Loading을 활용한 코드 스플리팅을 적용하여 초기 번들 크기를 줄이고, 첫 화면 렌더링 시간을 3초에서 1초 이하로 단축하여 쾌적한 사용자 경험을 제공했습니다.",
    role: "팀장 / PM / FE lead",
    period: "2025-08",
    tags: [
      "React",
      "Vite",
      "Tailwind CSS",
      "Kakao rest API",
      "OpenAI",
      "Vercel",
    ],

    github: "https://github.com/2025-Likelion-Hackathon/Team_Mut4_FE.git",
  },
  {
    id: "6",
    title: "[Capstone] 내길만 - AI 기반 맞춤형 경로 추천 서비스",
    imageUrl: "/load2.webp",
    description:
      "사용자의 이동 및 검색 패턴을 AI가 학습하여 개인화된 최적의 경로와 장소를 추천하는 졸업 작품 프로젝트입니다. 기획, UI/UX 설계, FE 개발을 총괄했으며, 그 성과를 학회 논문으로 발표했습니다.",
    achievement:
      '- PM 및 UI/UX 설계:\n 시장 조사를 통해 서비스의 방향성을 수립하고 Notion으로 기획을 구체화했습니다.\n Figma를 활용하여 전체 서비스의 UI/UX 설계를 직접 담당하며 사용자 중심의 인터페이스를 구축했습니다. \n 또한 Figma를 통해 인터랙티브 프로토타입을 제작하여 사용자 흐름과 주요 인터랙션을 실제처럼 검증했습니다.\n\n- 개발 생산성 향상: CRA의 느린 개발 서버 문제를 해결하기 위해 Vite 마이그레이션을 주도하여 개발 서버 구동 시간을 15초에서 2초 이내로 단축하고 팀의 개발 효율을 높였습니다.\n\n- 코드 안정성 및 협업 효율 개선: TypeScript를 전면 도입하여 복잡한 상태 데이터로 인한 런타임 에러를 70% 감소시키고, 명확한 타입 정의를 통해 팀원 간의 커뮤니케이션 비용을 줄였습니다. \n\n- 학술적 성과 인정:\n 프로젝트의 기술적 독창성과 정보 편의성 향상 방안을 인정받아, 한국엔터테인먼트산업학회에 "사용자 선호 기반 맞춤형 길 찾기 및 장소 추천 서비스 AI 기반 인포테인먼트 기술을 활용한 정보 편의성 향상 방안" 주제로 논문을 등재하고 직접 발표하는 성과를 거두었습니다.',
    role: "팀장 / PM / UI UX / FE",
    period: "2025.05 - 2025.06",
    tags: [
      "React",
      "TypeScript",
      "Vite",
      "Zustand",
      "Tailwind CSS",
      "Emotion",
      "Kakao rest API",
      "AI",
      "Cursor",
      "Vercel",
      "Figma",
    ],
    theis: "https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE12253169",
    figma:
      "https://www.figma.com/proto/o9zslKzAPQ8ElewOnOwTB7/%EC%BA%A1%EC%8A%A4%ED%86%A4-%EB%94%94%EC%9E%90%EC%9D%B8-2025---%EB%82%B4%EA%B8%B8%EB%A7%8C?page-id=3%3A3450&node-id=118-1786&viewport=280%2C355%2C0.25&t=4XrPPNwSA3g7jU0b-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=523%3A428",
    github: "https://github.com/yongchane/2025_Capstone.git",
  },
  {
    id: "7",
    title: "[전국 연합 동아리 SW 해커톤 1등] 물렐루야! - 물은 답을 알고 있다.",
    imageUrl: "/water.webp",
    description:
      "2024년 전국 연합 동아리 SW 해커톤에서 1등(단장상)을 수상한, 건강한 수분 섭취 습관 형성 서비스입니다.\n 단순히 마신 물의 양만 기록하는 것을 넘어, 커피나 주스 등 음료 종류별 수분 섭취량을 추적하고 통계와 루틴 기능을 제공하여 사용자가 자신의 습관을 직관적으로 관리하고 개선하도록 돕습니다.",
    achievement:
      "- 전국 연합 동아리 SW 해커톤 1등(단장상) 수상:\n 첫 해커톤 도전에서 팀의 1등 수상을 이끌었습니다.\n\n- PM :\n 팀장으로서 아이디어 기획부터 최종 발표까지 프로젝트 전 과정을 책임졌습니다.\n 무박 2일이라는 짧은 시간 동안 팀원들의 역할을 조율하고 동기를 부여하며 성공적으로 프로젝트를 완수했습니다. \n\n-  FE Lead :\n React 기반의 프론트엔드 개발을 리드하며, 메인 대시보드, 음료 기록, 통계 UI 등 사용자의 핵심 경험을 구성하는 주요 기능들을 직접 구현했습니다.",
    role: "팀장 / PM / FE Lead",
    period: "2024.09",
    tags: ["React", "SCSS", "Styled-Components", "Tailwind CSS"],
    github:
      "https://github.com/Hoseox9oormthonUniv-Hackathon/TEAM6_Water_lujah-_FE.git",
  },
];

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  return (
    <section id="projects" className="py-32 px-6 bg-secondary">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">Projects</h2>
        </motion.div>

        {/* Projects list */}
        <div className="space-y-24">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid md:grid-cols-3 gap-12 items-center"
            >
              {/* Image Section */}
              <motion.div
                className="relative w-full h-80 rounded-2xl overflow-hidden shadow-xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Image
                  src={project.imageUrl}
                  alt={project.title}
                  fill
                  quality={85}
                  priority={project.id === "1"}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover object-center"
                />
              </motion.div>

              {/* Text Content Section */}
              <div className="bg-white rounded-2xl border border-border p-8 md:col-span-2 shadow-lg">
                <button
                  className="w-full text-left cursor-pointer"
                  onClick={() =>
                    setSelectedProject(
                      selectedProject === project.id ? null : project.id
                    )
                  }
                  aria-expanded={selectedProject === project.id}
                  aria-label={`${project.title} 상세 정보 ${
                    selectedProject === project.id ? "닫기" : "펼치기"
                  }`}
                >
                  {/* Project header */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-3xl font-bold flex-1">
                      {project.title}
                    </h3>
                    <motion.svg
                      className="w-6 h-6 text-muted flex-shrink-0"
                      animate={{
                        rotate: selectedProject === project.id ? 180 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </motion.svg>
                  </div>
                  <p className="text-muted text-sm mb-4">
                    담당: {project.role} · {project.period}
                  </p>
                  <div className="pt-6 my-6 border-t border-border">
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {project.description}
                    </p>
                  </div>

                  {/* Tags and Links */}
                  <div className="flex flex-wrap items-center gap-2 ">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-secondary text-sm font-medium rounded-lg mb-[6px]"
                      >
                        {tag}
                      </span>
                    ))}
                    <div className="flex items-center gap-2 ml-auto mb-[6px]">
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          프로젝트 보기
                        </a>
                      )}
                      {project.figma && (
                        <a
                          href={project.figma}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Figma 보기
                        </a>
                      )}
                      {project.theis && (
                        <a
                          href={project.theis}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          논문 보기
                        </a>
                      )}
                      {project.github && (
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1 border-2 border-border text-sm font-semibold rounded-lg hover:border-primary hover:text-primary transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          GitHub
                        </a>
                      )}
                    </div>
                  </div>
                </button>

                {/* Project description (expandable) */}
                <motion.div
                  initial={false}
                  animate={{
                    height: selectedProject === project.id ? "auto" : 0,
                    opacity: selectedProject === project.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 mt-6 border-t border-border ">
                    <p className="text-muted font-[700] text-lg mb-4">
                      [주요 역할 및 성과]
                    </p>
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {project.achievement}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
