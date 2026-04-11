export function AccessGate({
  input,
  setInput,
  isSubmitting,
  authError,
  onSubmit,
}: {
  input: string;
  setInput: (value: string) => void;
  isSubmitting: boolean;
  authError: string | null;
  onSubmit: () => void | Promise<void>;
}) {
  return (
    <section className="min-h-screen bg-[#0b1020] px-6 py-24 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-white/50">Private Ops Console</p>
        <h1 className="mb-3 text-3xl font-bold">운영 콘솔 접근</h1>
        <p className="mb-6 text-white/70">개인 관리자 페이지입니다. 접근 코드를 입력해 주세요.</p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting) {
              void onSubmit();
            }
          }}
          placeholder="access code"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
        />
        <button
          onClick={() => void onSubmit()}
          disabled={isSubmitting || !input.trim()}
          className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "확인 중..." : "입장하기"}
        </button>
        {authError && <p className="mt-3 text-sm text-rose-300">{authError}</p>}
        <p className="mt-3 text-xs text-white/40">이제 잠금 화면에서는 운영 데이터가 서버 응답에 포함되지 않습니다.</p>
      </div>
    </section>
  );
}
