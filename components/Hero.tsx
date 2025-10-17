"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="pt-32 relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto text-center">
        {/* Greeting with stagger animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <span className="text-muted text-lg font-medium">
            Frontend Developer
          </span>
        </motion.div>

        {/* Main heading with word-by-word animation */}
        <motion.h1
          className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            처음 뵙겠습니다
          </motion.span>
          <br />
          <motion.span
            className="inline-block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            &ldquo;현용찬&rdquo; 입니다
          </motion.span>
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-xl md:text-2xl text-muted max-w-3xl mb-12 leading-relaxed text-left pl-6 md:pl-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          &ldquo;현&rdquo; 재를 통해 미래를 만드는 개발자,
          <br />
          &ldquo;용&rdquo; 기 있는 도전과 밝은 에너지로 새로운 길을 개척합니다.
          <br />
          &ldquo;찬&rdquo; 란한 성장과 함께 발전해 나가고 싶습니다.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.a
            href="#projects"
            className="group relative px-8 py-4 bg-primary text-white font-semibold rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10">프로젝트 보기</span>
            <motion.div
              className="absolute inset-0 bg-primary-hover"
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.a>

          <motion.a
            href="#contact"
            className="px-8 py-4 border-2 border-border font-semibold rounded-xl hover:border-primary hover:text-primary transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            연락하기
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          <motion.div
            className="w-6 h-10 border-2 border-border rounded-full flex justify-center"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="w-1.5 h-1.5 bg-primary rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
