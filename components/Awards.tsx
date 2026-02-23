"use client";

import { motion } from "framer-motion";
import type { Award } from "@/types";

// 논문·수상 데이터 - 추가 시 배열에 객체를 추가하세요
const awards: Award[] = [
  {
    id: "0",
    type: "paper",
    title:
      "사용자 선호 기반 맞춤형 길 찾기 및 장소 추천 서비스 — AI 기반 인포테인먼트 기술을 활용한 정보 편의성 향상 방안",
    organization: "한국엔터테인먼트산업학회",
    date: "2025.06",
    description:
      "졸업 작품 '내길만' 프로젝트의 기술적 독창성과 서비스 설계를 학술 논문으로 정리하여 학회에 등재 및 발표하였습니다.",
    link: "https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE12253169",
  },
  {
    id: "1",
    type: "award",
    title: "전국 연합 동아리 SW 해커톤 1등 (단장상)",
    organization: "전국 연합 동아리 SW 해커톤",
    date: "2024.09",
    description:
      "첫 해커톤 도전에서 무박 2일간 건강한 수분 섭취 습관 형성 서비스 '물렐루야!'를 기획·개발하여 팀을 1등으로 이끌었습니다.",
  },
];

const cardMeta = {
  paper: {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    badge: "논문",
    badgeStyle: "bg-blue-100 text-blue-700 border border-blue-300",
    accentStyle: "border-l-blue-400",
    iconBg: "bg-blue-50 text-blue-600",
    btnLabel: "논문 보기",
  },
  award: {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
    badge: "수상",
    badgeStyle: "bg-amber-100 text-amber-700 border border-amber-300",
    accentStyle: "border-l-amber-400",
    iconBg: "bg-amber-50 text-amber-600",
    btnLabel: "더 보기",
  },
};

export default function Awards() {
  return (
    <section id="awards" className="py-32 px-6 bg-secondary">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Publications & Awards
          </h2>
          <p className="text-muted text-lg">논문 등재 및 수상 이력</p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {awards.map((item, index) => {
            const meta = cardMeta[item.type];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className={`bg-white rounded-2xl border border-border shadow-lg border-l-4 ${meta.accentStyle} overflow-hidden`}
              >
                <div className="p-8">
                  {/* 상단: 아이콘 + 배지 + 날짜 */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.iconBg}`}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${meta.badgeStyle}`}
                      >
                        {meta.badge}
                      </span>
                      <span className="text-xs text-muted bg-secondary px-3 py-1 rounded-full border border-border">
                        {item.date}
                      </span>
                    </div>
                  </div>

                  {/* 기관명 */}
                  <p className="text-sm font-semibold text-muted mb-2">
                    {item.organization}
                  </p>

                  {/* 제목 */}
                  <h3 className="text-lg font-bold leading-snug mb-4">
                    {item.title}
                  </h3>

                  {/* 구분선 */}
                  <div className="border-t border-border mb-4" />

                  {/* 설명 */}
                  <p className="text-base text-muted leading-relaxed mb-6">
                    {item.description}
                  </p>

                  {/* 링크 버튼 */}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      {meta.btnLabel}
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
