"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { TechStack as TechStackType } from "@/types";

const techStacks: TechStackType[] = [
  {
    category: "Language ",
    items: [
      { name: "HTML5 ", proficiency: 80, experience: "2+ years" },
      { name: "CSS3", proficiency: 80, experience: "2+ years" },
      { name: "JavaScript (ES6+)", proficiency: 85, experience: "2+ years" },
      { name: "TypeScript", proficiency: 90, experience: "2+ years" },
    ],
  },
  {
    category: "Frameworks & Libraries",
    items: [
      { name: "React", proficiency: 90, experience: "2+ years" },
      { name: "Next.js", proficiency: 80, experience: "1.5+ years" },
      { name: "Tailwind CSS", proficiency: 85, experience: "1.5+ years" },
      {
        name: "Styled Components (CSS-in-JS)",
        proficiency: 85,
        experience: "2+ years",
      },
      { name: "Emotion(CSS-in-JS)", proficiency: 85, experience: "2+ years" },
      { name: "SCSS", proficiency: 85, experience: "2+ years" },
      { name: "Zustand", proficiency: 85, experience: "1+ year" },
      { name: "Axios", proficiency: 85, experience: "2+ years" },
      { name: "Vite", proficiency: 80, experience: "1+ year" },
    ],
  },
  {
    category: "Tools & Platforms",
    items: [
      { name: "Github", proficiency: 80, experience: "2+ year" },
      { name: "Figma", proficiency: 80, experience: "1.5+ year" },
      { name: "Notion", proficiency: 90, experience: "1.5+ year" },
      { name: "Git kraken", proficiency: 80, experience: "1.5+ year" },
      { name: "vercel", proficiency: 90, experience: "1.5+ year" },
      { name: "Vs Code", proficiency: 90, experience: "1.5+ year" },
      { name: "Cursor", proficiency: 80, experience: "1.5+ year" },
      { name: "Perplexity", proficiency: 90, experience: "1.5+ year" },
      { name: "Comet", proficiency: 80, experience: "1.5+ year" },
      { name: "Claude CLI", proficiency: 80, experience: "0.5+ year" },
      { name: "Gemini CLI", proficiency: 80, experience: "0.5+ year" },
    ],
  },
];

export default function TechStack() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <section id="tech-stack" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">Tech Stack</h2>
        </motion.div>

        {/* Category tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {techStacks.map((stack, index) => (
            <button
              key={stack.category}
              onClick={() => setActiveCategory(index)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeCategory === index
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-secondary text-muted hover:bg-border"
              }`}
            >
              {stack.category}
            </button>
          ))}
        </motion.div>

        {/* Tech items */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {techStacks[activeCategory].items.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{item.name}</h3>
                  <p className="text-muted text-sm">{item.experience}</p>
                </div>
                <span className="text-3xl font-bold text-primary">
                  {item.proficiency}%
                </span>
              </div>

              {/* Proficiency bar */}
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.proficiency}%` }}
                  transition={{
                    duration: 1,
                    delay: index * 0.1 + 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
