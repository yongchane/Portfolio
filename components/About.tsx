"use client";

import { motion } from "framer-motion";
import { FaUser, FaEnvelope, FaGithub, FaPhone } from "react-icons/fa";

export default function About() {
  return (
    <section id="about" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          {/* Left: Text content */}
          <div>
            <h2 className="text-5xl md:text-6xl font-bold mb-8">About Me</h2>
            <div className="space-y-8 text-lg leading-relaxed">
              <div className="space-y-2">
                <p className="font-semibold text-xl">
                  [의미를 찾는 프론트엔드]
                </p>
                <p className="text-muted">
                  모든 일에는 뜻이 있다고 믿습니다. 기능을 넘어 왜 이 경험이
                  필요한지부터 질문하고, 사용자와 비즈니스가 얻는 가치를 설계에
                  반영합니다.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-xl">
                  [행동으로 길을 여는 사람]
                </p>
                <p className="text-muted">
                  가만히 있기보다 작더라도 실행합니다. 빠르게 가설을 세우고
                  검증하며, 주도적으로 문제를 정의하고 해결해 나갑니다.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-xl">[성장에 진심인 개발자]</p>
                <p className="text-muted">
                  매 프로젝트마다 배움을 기록하고 개선합니다. 오늘의 선택이
                  내일의 기준이 되도록, 더 나은 코드와 경험을 꾸준히 쌓아갑니다.
                </p>
              </div>
            </div>
          </div>
          {/* Right: Contact Info */}
          <div className="flex flex-col gap-4 pt-[100px]">
            {[
              { icon: <FaUser />, label: "이름", value: "현용찬" },
              {
                icon: <FaEnvelope />,
                label: "이메일",
                value: "vaga0330@gmail.com",
                href: "mailto:vaga0330@gmail.com",
              },
              {
                icon: <FaGithub />,
                label: "GitHub",
                value: "https://github.com/yongchane",
                href: "https://github.com/yongchane",
              },
              {
                icon: (
                  <div className="scale-x-[-1]">
                    <FaPhone />
                  </div>
                ),
                label: "연락처",
                value: "010-8577-9717",
                href: "tel:010-8577-9717",
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <a
                  href={item.href || "#"}
                  target={item.href?.startsWith("http") ? "_blank" : undefined}
                  rel={
                    item.href?.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="block bg-secondary p-4 rounded-xl hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm text-text/80">{item.label}</p>
                      <p className="font-semibold">{item.value}</p>
                    </div>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>{" "}
        </motion.div>
      </div>
    </section>
  );
}
