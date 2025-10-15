"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Project } from "@/types";

// 샘플 프로젝트 데이터 - 실제 프로젝트로 교체하세요
const projects: Project[] = [
  {
    id: "1",
    title: "[외주] (주) 한국 기타가와 홈페이지 리뉴얼",
    imageUrl: "/kitagawa.png",
    description:
      " 정밀 척 및 공작기계 부품 분야의 글로벌 전문 기업인 기타가와(Kitagawa)의 한국 지사 웹사이트 개편 프로젝트를 외주로 맡아 수행중입니다. \n 노후화된 기존 사이트로 인해 현지 고객 접점이 악화된 상황에서, 한국 사용자 경험에 맞춘 PC, 모바일 반응형 웹사이트를 구축하여 브랜드 신뢰도를 강화하는 것을 목표로 하고있습니다",
    role: "PM / FE Lead",
    period: "(진행 중) 2025.08 - ",
    tags: ["TypeScript", "Next.js", "Zustand", "Tailwind CSS", "CSS-in-JS"],
    achievements: [
      "30+ 재사용 가능한 컴포넌트 설계 및 구현",
      "TypeScript 기반 타입 시스템으로 개발 생산성 40% 향상",
      "Tree-shaking 최적화로 번들 사이즈 60% 감소",
      "Storybook 기반 인터랙티브 문서화로 팀 협업 개선",
    ],
    link: "https://example.com",
    github: "https://github.com/example",
  },
  {
    id: "2",
    title: "대시보드 웹 애플리케이션",
    imageUrl: "/images/project2.png",
    description:
      "실시간 데이터 시각화 대시보드. Next.js와 Zustand를 활용한 복잡한 상태 관리 및 최적화된 렌더링 구현.",
    role: "Frontend Lead",
    period: "2023.06 - 2023.12",
    tags: ["Next.js", "TypeScript", "Zustand", "Recharts", "Tailwind CSS"],
    achievements: [
      "SSR/ISR을 활용한 초기 로딩 속도 70% 개선",
      "Zustand를 활용한 효율적인 전역 상태 관리",
      "React.memo와 useMemo를 활용한 렌더링 최적화",
      "Lighthouse 성능 점수 95점 이상 달성",
    ],
    link: "https://example.com",
  },
  {
    id: "3",
    title: "반응형 랜딩 페이지",
    imageUrl: "/images/project3.png",
    description:
      "모바일 우선 접근 방식으로 설계된 반응형 랜딩 페이지. 웹 표준과 접근성을 준수하며 부드러운 인터랙션 구현.",
    role: "Frontend Developer",
    period: "2023.01 - 2023.03",
    tags: ["React", "TypeScript", "Framer Motion", "WCAG 2.1"],
    achievements: [
      "WCAG 2.1 AA 수준 접근성 준수",
      "Framer Motion을 활용한 60fps 애니메이션",
      "모든 디바이스에서 일관된 사용자 경험 제공",
      "전환율 35% 증가",
    ],
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
          <p className="text-xl text-muted max-w-2xl mx-auto">
            실무에서 해결한 문제와 구현한 솔루션
          </p>
        </motion.div>

        {/* Projects list */}
        <div className="space-y-24">
          {projects.map((project, index) => (
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
                  className="transition-transform duration-500 hover:scale-105"
                />
              </div>

              {/* Text Content Section */}
              <div className="bg-white rounded-2xl border border-border p-8 col-span-2 shadow-lg">
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

                  {/* Project description */}
                  <p className="text-lg mb-6 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-secondary text-sm font-medium rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Achievements (expanded) */}
                <motion.div
                  initial={false}
                  animate={{
                    height: selectedProject === project.id ? "auto" : 0,
                    opacity: selectedProject === project.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 mt-6 border-t border-border">
                    <h4 className="text-xl font-bold mb-4">주요 성과</h4>
                    <ul className="space-y-3">
                      {project.achievements.map((achievement, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1 }}
                          className="flex gap-3"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <span className="text-lg">{achievement}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* Links */}
                    {(project.link || project.github) && (
                      <div className="flex gap-4 mt-6">
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            프로젝트 보기
                          </a>
                        )}
                        {project.github && (
                          <a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 border-2 border-border font-semibold rounded-lg hover:border-primary hover:text-primary transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            GitHub
                          </a>
                        )}
                      </div>
                    )}
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
