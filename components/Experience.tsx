"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import type { Experience } from "@/types";

// 경력 데이터 - 추가 시 아래 배열에 객체를 추가하세요
const experiences: Experience[] = [
  {
    id: "0",
    company: "(주) 한국 기타가와",
    position: "프론트엔드 개발 / 웹 퍼블리싱 / PM · 프리랜서",
    type: "freelance",
    period: "2025.08 - 2025.11",
    imageUrl: "/kitagawa.webp",
    description:
      "15년 이상 방치된 PHP 레거시 사이트를 Next.js/TypeScript로 전면 재구축하고, 1,000개 이상의 제품 데이터를 관리하는 관리자 페이지까지 기획·개발·QA 참여 및 진행 수행하였습니다.",
    highlights: [
      "레거시 리뉴얼",
      "관리자 페이지 개발",
      "On-Demand ISR",
      "Discord 봇 연동",
      "GCS · CDN",
      "SEO 최적화",
    ],
    achievement:
      "- 레거시 전면 재구축 (PHP → Next.js): 15년 된 PHP 서버를 Next.js/TypeScript로 완전 대체하고 SSL(HTTPS) 적용 및 보안 취약점을 개선하여 모던 웹 아키텍처 기반의 안정성을 확보했습니다.\n\n- 대규모 데이터 렌더링 최적화 (SSG + On-Demand ISR): 1,000개 이상의 제품 데이터 렌더링 시 발생하는 서버 부하 병목을 SSG(generateStaticParams) + 부분적 On-Demand ISR 방식으로 해결하여 관리자가 제품을 수정·추가하면 실시간으로 홈페이지에 반영되도록 구현했습니다. Lighthouse 성능 12점→94점 (683%↑), 초기 로딩 4.8s→1.0s (79%↓) 달성\n\n- 관리자 페이지 + Discord 봇 실시간 알림: 제품 CRUD·문의 관리 기능을 갖춘 관리자 페이지를 독자 설계하고, 제품 데이터 변경·추가 시 Discord 봇이 담당자에게 실시간 알림을 전송하는 모니터링 시스템을 구축했습니다.\n\n- Cloud 인프라 (GCS · CDN): 로컬 스토리지 한계 극복을 위해 Google Cloud Storage API를 연동하여 Admin 제품 이미지 CRUD 및 Contact Us 파일 첨부 기능을 서버 부하 없는 확장형 아키텍처로 구현했습니다.\n\n- SEO 비즈니스 성과: Core Web Vitals(LCP·INP·CLS) 주간 추적, 시멘틱 마크업 및 메타데이터 동적 생성 구현으로 구글·네이버 검색 월 노출 0→1,900회, CTR 11.41% 달성\n\n- DevOps: Vercel CI/CD 파이프라인 구축 및 MX 레코드 설정을 통한 기업 메일 시스템 최적화",
    tags: [
      "TypeScript",
      "Next.js",
      "Zustand",
      "Tailwind CSS",
      "Emotion",
      "GCS",
      "On-Demand ISR",
      "Vercel",
    ],
    link: "https://www.kitagawa.co.kr/",
  },
];

const typeLabel: Record<Experience["type"], string> = {
  freelance: "프리랜서",
  fulltime: "정규직",
  parttime: "파트타임",
  internship: "인턴",
};

const typeBadgeStyle: Record<Experience["type"], string> = {
  freelance: "bg-amber-100 text-amber-700 border border-amber-300",
  fulltime: "bg-blue-100 text-blue-700 border border-blue-300",
  parttime: "bg-purple-100 text-purple-700 border border-purple-300",
  internship: "bg-green-100 text-green-700 border border-green-300",
};

export default function Experience() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section id="experience" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">Experience</h2>
          <p className="text-muted text-lg">실무 경험과 프리랜서 프로젝트</p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* 세로 라인 */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px hidden sm:block" />

          <div className="space-y-12">
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative flex flex-col md:flex-row gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* 타임라인 점 */}
                <div className="absolute left-6 md:left-1/2 top-8 w-3 h-3 rounded-full bg-primary border-4 border-white shadow-md md:-translate-x-1.5 hidden sm:block z-10" />

                {/* 날짜 (데스크탑) */}
                <div
                  className={`hidden md:flex md:w-1/2 items-start pt-7 ${
                    index % 2 === 0
                      ? "justify-end pr-12"
                      : "justify-start pl-12"
                  }`}
                >
                  <span className="text-muted font-medium text-sm bg-secondary px-4 py-2 rounded-lg border border-border">
                    {exp.period}
                  </span>
                </div>

                {/* 카드 */}
                <div
                  className={`md:w-1/2 ${index % 2 === 0 ? "md:pl-12" : "md:pr-12"} pl-10 sm:pl-16 md:pl-12`}
                >
                  <div className="bg-white rounded-2xl border border-border shadow-lg overflow-hidden">
                    {/* 이미지 */}
                    {exp.imageUrl && (
                      <div className="relative w-full h-48 overflow-hidden">
                        <Image
                          src={exp.imageUrl}
                          alt={exp.company}
                          fill
                          quality={85}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover object-center"
                        />
                        {/* 이미지 위 그라디언트 오버레이 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        {/* 타입 배지 - 이미지 위 */}
                        <div className="absolute top-4 left-4">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${typeBadgeStyle[exp.type]}`}
                          >
                            {typeLabel[exp.type]}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      {/* 모바일 날짜 */}
                      <span className="md:hidden text-xs text-muted font-medium bg-secondary px-3 py-1 rounded-lg border border-border inline-block mb-3">
                        {exp.period}
                      </span>

                      {/* 회사 & 직책 */}
                      <div className="mb-1">
                        <h3 className="text-xl font-bold">{exp.company}</h3>
                        <p className="text-muted text-sm mt-1">
                          {exp.position}
                        </p>
                      </div>

                      {/* 구분선 */}
                      <div className="border-t border-border my-4" />

                      {/* 설명 */}
                      <p className="text-base leading-relaxed whitespace-pre-line text-foreground/80 mb-4">
                        {exp.description}
                      </p>

                      {/* 핵심 작업 영역 하이라이트 */}
                      {exp.highlights && exp.highlights.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                            핵심 작업 영역
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {exp.highlights.map((h) => (
                              <span
                                key={h}
                                className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 기술 태그 */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {exp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-secondary text-sm font-medium rounded-lg border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* 성과 토글 버튼 + 링크 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === exp.id ? null : exp.id)
                          }
                          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                          aria-expanded={expandedId === exp.id}
                        >
                          <span>
                            {expandedId === exp.id
                              ? "성과 접기"
                              : "주요 성과 보기"}
                          </span>
                          <motion.svg
                            className="w-4 h-4"
                            animate={{
                              rotate: expandedId === exp.id ? 180 : 0,
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
                        </button>

                        <div className="flex items-center gap-2 ml-auto">
                          {exp.link && (
                            <a
                              href={exp.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                            >
                              사이트 보기
                            </a>
                          )}
                          {exp.github && (
                            <a
                              href={exp.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 border-2 border-border text-sm font-semibold rounded-lg hover:border-primary hover:text-primary transition-all"
                            >
                              GitHub
                            </a>
                          )}
                        </div>
                      </div>

                      {/* 성과 (expandable) */}
                      <motion.div
                        initial={false}
                        animate={{
                          height: expandedId === exp.id ? "auto" : 0,
                          opacity: expandedId === exp.id ? 1 : 0,
                        }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pt-5 mt-5 border-t border-border">
                          <p className="text-muted font-[700] text-base mb-3">
                            [주요 역할 및 성과]
                          </p>
                          <p className="text-base leading-relaxed whitespace-pre-line">
                            {exp.achievement}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
