"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Project } from "@/types";

// 샘플 프로젝트 데이터 - 실제 프로젝트로 교체하세요
const projects: Project[] = [
  {
    id: "1",
    title: "개인 포트폴리오 웹사이트 제작",
    imageUrl: "/portfolio.png",
    description:
      "저의 개발 여정과 성과를 효과적으로 보여주기 위해 Next.js와 TypeScript를 기반으로 직접 구축한 포트폴리오 웹사이트입니다. \n 단순한 정보 나열을 넘어, 사용자 친화적인 UI/UX와 최적화된 성능을 통해 방문자가 저의 강점을 명확히 인지하도록 설계했습니다.",
    achievement:
      "- 1인 기획/개발/디자인: \n 개인 포트폴리오의 목적과 페르소나를 명확히 설정하고, UI/UX 설계부터 FE 개발, 최종 배포까지 전 과정을 1인으로 책임졌습니다. \n\n- 성능 및 SEO 최적화:\n Next.js의 기능을 활용하여 초기 렌더링 속도를 향상시켰습니다. \n 또한, 직접 도메인을 구매하고 구글 SEO 작업을 진행하여 검색 엔진 최적화를 완료, 잠재적인 협업 기회와 사용자 접근성을 확보했습니다.\n\n- 기술 스택 활용:\n Tailwind CSS로 빠르고 일관된 스타일링을 적용했으며, Framer Motion으로 동적인 인터랙션을 구현하여 방문자에게 직관적이고 인상적인 경험을 제공했습니다.",
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
    title: "[외주] (주) 한국 기타가와 홈페이지 리뉴얼",
    imageUrl: "/kitagawa.jpeg",
    description:
      " 정밀 척 및 공작기계 부품 분야의 글로벌 전문 기업인 기타가와(Kitagawa)의 한국 지사 웹사이트 개편 프로젝트를 외주로 맡아 수행중입니다. \n 노후화된 기존 사이트로 인해 현지 고객 접점이 악화된 상황에서, 한국 사용자 경험에 맞춘 PC, 모바일 반응형 웹사이트를 구축하여 브랜드 신뢰도를 강화하는 것을 목표로 하고있습니다",
    achievement:
      "- PM:\n 회사 대표님과 미팅을 통해 요구사항을 분석하고, 이를 바탕으로 전체 프로젝트 기획 및 일정 관리를 주도했습니다.\n\n- FE Lead:\n Next.js 기반 아키텍처를 설계하고, 회사 전체 페이지, 반응형 웹/앱, 관리자 페이지 개발을 담당했습니다.\n\n- 성능 최적화:\n 5,000건 이상의 제품 데이터를 효율적으로 처리하기 위해 SSR과 TanStack Query를 적용, 기존 사이트 대비 페이지 렌더링 속도를 70% 이상 개선했습니다.",
    role: "팀장 / PM / FE ",
    period: "(진행 중) 2025.08 - ",
    tags: [
      "TypeScript",
      "Next.js",
      "TanStack Query",
      "Zustand",
      "Tailwind CSS",
      "CSS-in-JS",
    ],
  },
  {
    id: "3",
    title: "[Vibe coding] 운빨 고양이 달리기 게임",
    imageUrl: "/runcat.png",
    description:
      "'AI 툴로 20개 프로젝트 만들기' 챌린지의 두 번째 작업물입니다.\n Next.js와 TypeScript를 기반으로, HTML Canvas를 사용하여 고양이가 달리는 로그라이크형 게임을 구현하는 중입니다. 10 스테이지마다 주어지는 랜덤 음식을 통해 고양이가 새로운 능력치를 얻고 모습이 진화하는 독특한 컨셉으로, AI를 활용한 신속한 프로토타이핑과 개발 가능성을 탐구한 프로젝트입니다.",
    achievement:
      "- 기획(PM):\n Perplexity로 자료를 조사하고 Claude와 함께 아이디어를 구체화하며 전체 프로젝트를 기획했습니다.\n\n- 디자인:\n Gemini의 이미지 생성 모델을 활용해 초기 캐릭터 컨셉을 디자인하고, Adobe 툴로 디테일을 완성하여 독창적인 게임 비주얼을 구현했습니다.\n\n- FE 개발:\n Claude CLI와 VSCode Copilot을 적극 활용하는 '바이브 코딩'으로 개발 생산성을 극대화했습니다. 복잡한 게임 로직과 캐릭터 애니메이션을 Canvas API 위에 효율적으로 구현하며 AI 기반 개발 워크플로우를 성공적으로 구축했습니다.",
    role: "1인 개발 / PM / Design / FE",
    period: "(진행중) 2025.09 - ",
    tags: ["TypeScript", "Next.js", "Canvas API", "Zustand", "AI Development"],
    github: "https://github.com/yongchane/CatRunner.git",
  },
  {
    id: "4",
    title: "[Vibe coding] 별똥별 게임",
    imageUrl: "/star.png",
    description:
      "빠르게 발전하는 AI 툴에 적응하고, 아이디어를 실제 서비스로 완성하는 전 과정을 경험하기 위한 'AI 툴로 20개 프로젝트 만들기' 챌린지의 첫 번째 프로젝트입니다. \n Next.js와 Framer Motion을 활용하여 화려한 인터랙션을 갖춘 웹 게임을 구현했으며, 현재 실제 도메인을 연결하여 라이브 서비스를 운영하고 있습니다.",
    achievement:
      "- 1인 개발(기획/FE):\n Perplexity로 아이디어를 얻고 Claude를 활용해 기획부터 개발까지 1인 개발로 완수하며 AI 기반 개발 생산성을 입증했습니다.\n\n- 성능 최적화:\n Next.js의 SSR/ISR을 적용하여 초기 로딩 속도를 최적화했으며, Zustand를 통해 효율적으로 상태를 관리했습니다. \n Framer Motion으로 사용자에게 부드러운 애니메이션 경험을 제공했습니다.\n\n- 서비스 배포 및 운영:\n 직접 도메인을 구매하고 연결부터 배포까지 직접 수행하여 실제 서비스를 런칭했습니다. \n 또한, 구글 SEO 작업을 진행하여 검색 엔진 최적화를 완료, 잠재적인 협업 기회와 사용자 접근성을 확보했습니다.\n 현재는 사용자 확보를 위한 마케팅 전략을 구상하며 서비스 고도화를 준비하고 있습니다.",
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
    link: "https://example.com",
    github: "https://github.com/yongchane/ShootingStar.git",
  },
  {
    id: "5",
    title: "TOOR - 너와 나의 투어를 잇는 토박이",
    imageUrl: "/toor.png",
    description:
      "현지인 데이터와 AI를 통해 여행지의 가격 불투명성(바가지) 문제를 해결하는 신뢰 기반 여행 플랫폼입니다. \n GPS 기반의 현지인 인증 시스템으로 신뢰도 높은 정보를 제공하고, AI 챗봇이 개인화된 여행 가이드를 제시하여 국내 여행의 가성비를 혁신하는 것을 목표로 합니다.",
    achievement:
      "- PM:\n 팀 리더로서 '바가지 없는 여행'이라는 서비스의 핵심 가치를 설정하고, 아이디어 기획부터 백엔드/디자인 팀과의 협업을 조율하며 프로젝트 전체를 이끌었습니다.\n\n- FE Lead:\n React(Vite), Tailwind CSS를 기반으로 모바일 우선의 반응형 웹 아키텍처를 설계하고 프론트엔드 개발을 총괄했습니다. \n Vercel을 통한 배포를 완료하였습니다. \n\n- 핵심 기능 개발:\n GPS를 활용한 위치 기반 현지인 인증, 실시간 가격 비교 카드 UI, 북마크 API 연동, OpenAI GPT 기반의 AI 챗봇 등 서비스의 주요 기능을 직접 구현하여 아이디어를 성공적으로 현실화했습니다.",
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
    imageUrl: "/load2.png",
    description:
      "사용자의 이동 및 검색 패턴을 AI가 학습하여 개인화된 최적의 경로와 장소를 추천하는 졸업 작품 프로젝트입니다. React와 TypeScript를 기반으로, 카카오맵 API와 AI 추천 엔진을 연동하여 '나만을 위한 길'을 찾아주는 새로운 인포테인먼트 서비스를 구현했습니다.",
    achievement:
      '- PM 및 UI/UX 설계:\n 시장 조사를 통해 서비스의 방향성을 수립하고 Notion으로 기획을 구체화했습니다.\n Figma를 활용하여 전체 서비스의 UI/UX 설계를 직접 담당하며 사용자 중심의 인터페이스를 구축했습니다.\n\n- FE 개발:\n React(Vite), TypeScript, Tailwind CSS 기반의 프론트엔드 아키텍처를 설계하고 개발을 총괄했습니다. \n 카카오맵 API를 연동하여 지도/경로 시각화 기능을 구현하고, AI 기반 패턴 분석 추천 모듈을 연동하는 핵심 파트를 담당했습니다. \n Vercel을 통한 배포를 완료하였습니다. \n\n- 학술적 성과 인정:\n 프로젝트의 기술적 독창성과 정보 편의성 향상 방안을 인정받아, 한국엔터테인먼트산업학회에 "사용자 선호 기반 맞춤형 길 찾기 및 장소 추천 서비스 AI 기반 인포테인먼트 기술을 활용한 정보 편의성 향상 방안" 주제로 논문을 등재하고 직접 발표하는 성과를 거두었습니다.',
    role: "팀장 / PM / UI UX / FE",
    period: "2025.05 - 2025.06",
    tags: [
      "React",
      "TypeScript",
      "Vite",
      "Zustand",
      "Tailwind CSS",
      "Kakao rest API",
      "AI",
      "Cursor",
      "Vercel",
    ],
    figma:
      "https://www.figma.com/proto/o9zslKzAPQ8ElewOnOwTB7/%EC%BA%A1%EC%8A%A4%ED%86%A4-%EB%94%94%EC%9E%90%EC%9D%B8-2025---%EB%82%B4%EA%B8%B8%EB%A7%8C?page-id=3%3A3450&node-id=118-1786&viewport=280%2C355%2C0.25&t=4XrPPNwSA3g7jU0b-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=523%3A428",
    github: "https://github.com/yongchane/2025_Capstone.git",
  },
  {
    id: "7",
    title: "[전국 연합 동아리 SW 해커톤 1등] 물렐루야! - 물은 답을 알고 있다.",
    imageUrl: "water.png",
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
              <div
                className={`relative w-full h-80 rounded-2xl overflow-hidden shadow-xl `}
              >
                <motion.img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                />
              </div>

              {/* Text Content Section */}
              <div className="bg-white rounded-2xl border border-border p-8 md:col-span-2 shadow-lg">
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedProject(
                      selectedProject === project.id ? null : project.id
                    )
                  }
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
                    <div className="flex items-center gap-2 ml-auto">
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
                </div>

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
