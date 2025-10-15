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
  title: "Frontend Developer Portfolio | NHN Cloud 지원",
  description:
    "TypeScript와 React를 활용한 프론트엔드 개발자 포트폴리오. UI 컴포넌트 라이브러리 설계 및 웹 표준 준수 경험.",
  keywords: [
    "Frontend Developer",
    "React",
    "TypeScript",
    "Next.js",
    "UI Components",
    "NHN Cloud",
  ],
  authors: [{ name: "Your Name" }],
  openGraph: {
    title: "Frontend Developer Portfolio",
    description: "TypeScript와 React를 활용한 프론트엔드 개발자",
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
