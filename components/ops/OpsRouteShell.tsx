"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { AccessGate } from "@/components/ops/auth/AccessGate";
import { CmsMetricPill, Panel, VisualDivider } from "@/components/ops/shared";
import type { OpsConsoleData } from "@/lib/ops/types";

const navItems = [
  { href: "/ops", label: "홈", icon: "⌂", group: "Home" },
  { href: "/ops/projects", label: "프로젝트 관리", icon: "◆", group: "Design" },
  { href: "/ops/macmini", label: "맥미니 관리", icon: "◉", group: "System" },
  { href: "/ops/openclaw", label: "오픈클로 관리", icon: "✦", group: "AI Ops" },
  { href: "/ops/docs", label: "옵시디언 문서", icon: "▣", group: "Docs" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/ops") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OpsRouteShell({
  authenticated,
  data,
  title,
  subtitle,
  children,
  hideHeader = false,
  mainClassName,
}: {
  authenticated: boolean;
  data: OpsConsoleData | null;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  hideHeader?: boolean;
  mainClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleUnlock() {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/ops/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: input }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setAuthError(payload?.message || "접근 코드 확인에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setAuthError("잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authenticated || !data) {
    return (
      <AccessGate
        input={input}
        setInput={setInput}
        isSubmitting={isSubmitting}
        authError={authError}
        onSubmit={handleUnlock}
      />
    );
  }

  return (
    <section className="min-h-screen bg-[#070b16] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_45%_82%,rgba(16,185,129,0.10),transparent_34%)]" />
      <div className={clsx("relative grid min-h-screen transition-[grid-template-columns] duration-300", sidebarOpen ? "lg:grid-cols-[260px_1fr]" : "lg:grid-cols-[72px_1fr]")}>
        <aside className={clsx("border-r border-white/10 bg-black/25 backdrop-blur-xl transition-all duration-300", sidebarOpen ? "p-6" : "p-3")}>
          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="mb-4 grid h-10 w-full place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm text-white/70 transition hover:bg-white/10"
            aria-label={sidebarOpen ? "운영 콘솔 접기" : "운영 콘솔 열기"}
          >
            {sidebarOpen ? "← 콘솔 접기" : "→"}
          </button>

          <div className={clsx("mb-6 rounded-[1.75rem] border border-cyan-300/15 bg-cyan-400/10 shadow-2xl shadow-cyan-500/10 transition-all", sidebarOpen ? "p-4" : "grid place-items-center p-3")}>
            {sidebarOpen ? (
              <>
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-cyan-100/55">Aeyong OS</p>
                <h1 className="text-2xl font-bold">현용찬 운영 콘솔</h1>
                <p className="mt-2 text-xs leading-5 text-white/55">라우팅 기반 개인 운영 콘솔.</p>
              </>
            ) : (
              <span className="text-xl">⌘</span>
            )}
          </div>

          <nav className="mb-6 space-y-2">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group relative block w-full overflow-hidden rounded-2xl border px-3 py-3 text-left text-sm font-medium transition",
                    active
                      ? "border-white/35 bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                      : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/10",
                  )}
                >
                  <span className={clsx("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                    <span className={clsx("grid h-8 w-8 place-items-center rounded-xl text-xs", active ? "bg-black text-white" : "bg-white/10 text-white/70")}>{item.icon}</span>
                    {sidebarOpen && (
                      <span>
                        <span className="block">{item.label}</span>
                        <span className={clsx("text-[10px] uppercase tracking-[0.18em]", active ? "text-black/45" : "text-white/35")}>{item.group}</span>
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          {sidebarOpen && (
            <>
              <VisualDivider />

              <div className="my-5 grid grid-cols-2 gap-2">
                <CmsMetricPill label="Projects" value={String(data.projects.length)} tone="cyan" />
                <CmsMetricPill label="Repos" value={String(data.github.repoSnapshots.length)} tone="violet" />
                <CmsMetricPill label="Docs" value={String(data.notes.length)} tone="emerald" />
                <CmsMetricPill label="Runs" value={String(data.agentRuns.length)} tone="amber" />
              </div>

              <Panel title="현재 단계">
                <ul className="list-disc space-y-2 pl-4 text-sm text-white/80">
                  <li>프론트 라우팅/UI 목업</li>
                  <li>API/DB 연동 전 화면 검증</li>
                  <li>프로젝트 관리는 list → add → canvas 플로우</li>
                </ul>
              </Panel>

              <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-200/70">Ops data source</p>
                <p className="text-sm text-white/85">mode: <strong>{data.dataSource.mode}</strong></p>
                <p className="mt-1 text-xs text-white/55">updated {data.dataSource.generatedAt}</p>
              </div>
            </>
          )}
        </aside>

        <main className={clsx("relative p-6 lg:p-10", mainClassName)}>
          {!hideHeader && (
            <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Ops Console</p>
              <h2 className="mt-2 text-2xl font-bold">{title}</h2>
              {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </section>
  );
}
