"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import type { OpsConsoleData } from "@/lib/ops/types";

export function FloatingAgentPanel({ data, selectedProjectId }: { data: OpsConsoleData; selectedProjectId?: string }) {
  const [open, setOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(data.agents[0]?.id || "aeyong-manager");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProject = useMemo(
    () => data.projects.find((project) => project.id === selectedProjectId) || data.projects[0],
    [data.projects, selectedProjectId],
  );
  const agents = data.agents.length ? data.agents : [
    { id: "aeyong-manager", name: "Aeyong Manager", role: "manager", runtime: "openclaw", status: "active" },
    { id: "qa-agent", name: "QA Agent", role: "qa", runtime: "openclaw", status: "active" },
    { id: "security-agent", name: "Security Agent", role: "security", runtime: "openclaw", status: "active" },
    { id: "uiux-agent", name: "UI/UX Agent", role: "uiux", runtime: "openclaw", status: "active" },
    { id: "docs-agent", name: "Docs Agent", role: "docs", runtime: "openclaw", status: "active" },
  ] as const;
  const recentRuns = data.agentRuns.slice(0, 5);

  async function createRun() {
    setMessage(null);
    if (!prompt.trim()) {
      setMessage("작업 요청을 입력해 주세요.");
      return;
    }

    const response = await fetch("/api/ops/agent-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: selectedAgentId,
        projectId: selectedProject?.id,
        prompt: prompt.trim(),
        scope: {
          source: "floating-agent-panel",
          repo: selectedProject?.repo,
          branch: selectedProject?.branch || "develop",
          deployUrl: selectedProject?.deployUrl,
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.message || "Agent run 생성에 실패했습니다.");
      return;
    }
    setPrompt("");
    setMessage("Agent run queued. Mac mini worker가 감지해서 처리합니다.");
    startTransition(() => window.location.reload());
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <section className="w-[min(420px,calc(100vw-2rem))] rounded-3xl border border-white/15 bg-slate-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">AI Agents</p>
              <h3 className="mt-1 text-xl font-bold">/ops 관리 매니저</h3>
              <p className="mt-1 text-xs text-white/55">Cursor처럼 빠르게 agent run을 만들되, 실제 처리는 Supabase queue와 Mac mini worker가 담당합니다.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20">닫기</button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/40">Agent</span>
              <select value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
              Context: <strong className="text-white">{selectedProject?.name || "프로젝트 미선택"}</strong> · {selectedProject?.repo || "repo 없음"} · {selectedProject?.branch || "branch 미기록"}
            </div>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/40">Request</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} placeholder="예: 이 프로젝트를 QA/security/UIUX 관점으로 리뷰하고 코멘트 남겨줘" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-white/25" />
            </label>
            <button onClick={() => void createRun()} disabled={isPending} className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-60">
              {isPending ? "Queue 생성 중..." : "Agent run 생성"}
            </button>
            {message && <p className="text-xs text-white/60">{message}</p>}
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Recent runs</p>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <article key={run.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/65">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <strong className="text-white">{run.agentId}</strong>
                    <span className={clsx("rounded-full px-2 py-0.5", run.status === "completed" ? "bg-emerald-100 text-emerald-700" : run.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-white/10 text-white/70")}>{run.status}</span>
                  </div>
                  <p className="line-clamp-2">{run.prompt}</p>
                </article>
              ))}
              {!recentRuns.length && <p className="rounded-2xl border border-dashed border-white/10 p-3 text-xs text-white/40">아직 agent run이 없습니다.</p>}
            </div>
          </div>
        </section>
      )}
      <button onClick={() => setOpen((current) => !current)} className="rounded-full border border-white/20 bg-white px-5 py-3 font-semibold text-black shadow-2xl shadow-black/30 transition hover:scale-[1.02]">
        AI Agents
      </button>
    </div>
  );
}
