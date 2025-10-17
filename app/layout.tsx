import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "현용찬의 포트폴리오 - 프론트엔드 개발자",
  description: "안녕하세요 Frontend Developer 현용찬입니다. 환영합니다!",
  keywords: [
    "Frontend Developer",
    "React",
    "TypeScript",
    "Next.js",
    "UI Components",
    "Portfolio",
    "현용찬",
    "프론트엔드 개발자",
    "웹 개발",
    "프로그래밍",
    "프론트엔드 포트폴리오",
    "웹 애플리케이션",
    "사용자 인터페이스",
    "웹 디자인",
    "프론트엔드 기술",
    "오픈 소스",
    "개발 블로그",
    "코딩 프로젝트",
    "프론트엔드 아키텍처",
    "웹 성능 최적화",
    "접근성",
    "반응형 디자인",
    "현용찬 포트폴리오",
  ],
  authors: [{ name: "현용찬" }],
  openGraph: {
    title: "현용찬의 포트폴리오 - 프론트엔드 개발자",
    description: "안녕하세요 Frontend Developer 현용찬입니다. 환영합니다!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
