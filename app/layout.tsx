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
  metadataBase: new URL("https://www.hyunyongchan.kr"),
  title: {
    default: "현용찬 | Frontend Developer Portfolio",
    template: "%s | 현용찬",
  },
  description:
    "프론트엔드 개발자 현용찬의 포트폴리오입니다. React, Next.js, TypeScript를 활용한 웹 개발 프로젝트와 기술 스택을 소개합니다.",
  keywords: [
    "현용찬",
    "hyunyongchan",
    "Hyun Yongchan",
    "Frontend Developer",
    "프론트엔드 개발자",
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "웹 개발자",
    "포트폴리오",
    "Portfolio",
    "웹 개발",
    "UI/UX",
    "프론트엔드",
    "개발자 포트폴리오",
  ],
  authors: [{ name: "현용찬", url: "https://www.hyunyongchan.kr" }],
  creator: "현용찬",
  publisher: "현용찬",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.hyunyongchan.kr",
    title: "현용찬 | Frontend Developer Portfolio",
    description:
      "프론트엔드 개발자 현용찬의 포트폴리오입니다. React, Next.js, TypeScript를 활용한 웹 개발 프로젝트와 기술 스택을 소개합니다.",
    siteName: "현용찬 포트폴리오",
    images: [{ url: "/logo.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "현용찬 | Frontend Developer Portfolio",
    description:
      "프론트엔드 개발자 현용찬의 포트폴리오입니다. React, Next.js, TypeScript를 활용한 웹 개발 프로젝트와 기술 스택을 소개합니다.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google:
      "google-site-verification=6t4Xj9ynV-QobYWpgTe7ngKVp8CRDzzyHlIEKHI9pvQ", // Google Search Console에서 발급받은 코드로 교체 필요
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "현용찬",
    alternateName: "Hyun Yongchan",
    url: "https://www.hyunyongchan.kr",
    jobTitle: "Frontend Developer",
    description:
      "프론트엔드 개발자 현용찬의 포트폴리오입니다. React, Next.js, TypeScript를 활용한 웹 개발 프로젝트와 기술 스택을 소개합니다.",
    email: "vaga0330@gmail.com",
    knowsAbout: [
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Frontend Development",
      "Web Development",
      "UI/UX",
    ],
    sameAs: ["https://github.com/yongchane"],
  };

  return (
    <html lang="ko" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
