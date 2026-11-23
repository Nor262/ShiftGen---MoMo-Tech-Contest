"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CAST } from "@/lib/cast";
import { newSessionSlug } from "@/lib/demo-session";
import { DEMO_SIMULATION_LABEL, type HealthResponse, type SessionResponse } from "@/contracts";

/** "Hôm nay": what happens without TrustLoop (illustration, CASE-01 amounts, neutral tone). */
const TODAY = [
  { at: "Phút 00", label: "Nhận tin nhắn Zalo tự xưng công an, dọa bắt giam." },
  { at: "00–88", label: "Điểm mù: mọi chuyện diễn ra ngoài ứng dụng ví, không ai thấy." },
  { at: "Phút 89", label: "Hoảng sợ, chuyển 4 lần × 9.500.000đ." },
  { at: "Phút 90+", label: "Tiền đã sang ví trung gian và bị tẩu tán." },
] as const;

/** "Có TrustLoop" is DESIGN.md's Minute Timeline: the same minutes, a different ending. */
const WITH_TRUSTLOOP = [
  { at: "Phút 00", label: "Quét tin nhắn: AI chỉ ra dấu hiệu giả danh và thao túng.", marker: true },
  { at: "Phút 89", label: "Lệnh đầu tiên bị tạm giữ theo chế độ Bảo vệ 24h Bác đã bật; người giám hộ được báo.", hold: true },
  { at: "Phút 90+", label: "Đội Risk điều tra, hai người duyệt độc lập, tài khoản nhận bị cảnh báo." },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [resetting, setResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      const [sessRes, healthRes] = await Promise.all([
        fetch("/api/session", { cache: "no-store" }),
        fetch("/api/health", { cache: "no-store" }),
      ]);
      if (sessRes.ok) setSession((await sessRes.json()) as SessionResponse);
      if (healthRes.ok) setHealth((await healthRes.json()) as HealthResponse);
    } catch {
      setStatusMessage("Không thể tải trạng thái phiên demo.");
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function handleResetDemo() {
    setResetting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      const data = (await res.json()) as { sessionId: string; seededCasesCount: number };
      setStatusMessage(`Đã khôi phục phiên "${data.sessionId}" (${data.seededCasesCount} kịch bản ${DEMO_SIMULATION_LABEL}).`);
      await loadState();
    } catch {
      setStatusMessage("Lỗi khi khôi phục dữ liệu phiên demo.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Chặn lừa đảo từ Phút 00 — trước khi tiền rời ví</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Cùng một vụ lừa đảo, hai kết cục. TrustLoop chen vào đúng những phút ứng dụng ví hôm nay chưa thấy.
        </p>
      </section>

      {/* Two lanes: today vs with TrustLoop */}
      <section aria-label="Hôm nay và khi có TrustLoop" className="grid gap-4 lg:grid-cols-2">
        <article aria-labelledby="lane-today" className="rounded-2xl border border-slate-300 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="lane-today" className="text-xl font-semibold text-slate-700">
              Hôm nay (không có TrustLoop)
            </h2>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-900">
              {DEMO_SIMULATION_LABEL}
            </span>
          </div>
          <ol className="mt-4 space-y-3">
            {TODAY.map((t) => (
              <li key={t.at} className="flex gap-3">
                <span className="w-20 shrink-0 font-mono text-base font-semibold text-slate-500">{t.at}</span>
                <span className="text-base text-slate-700">{t.label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-lg font-semibold text-slate-800">
            {CAST.USER_B2C_HUNG.name} mất 38.000.000đ
          </p>
        </article>

        <article aria-labelledby="lane-trustloop" className="rounded-2xl border border-emerald-300 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="lane-trustloop" className="text-xl font-semibold text-momo-primary">
              Có TrustLoop
            </h2>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-900">
              {DEMO_SIMULATION_LABEL}
            </span>
          </div>
          <ol className="mt-4 space-y-3">
            {WITH_TRUSTLOOP.map((t) => (
              <li
                key={t.at}
                className={"hold" in t ? "flex gap-3 rounded-lg border-l-4 border-signal-700 bg-signal-50 p-2" : "flex gap-3"}
              >
                <span className="w-20 shrink-0 font-mono text-base font-semibold text-momo-primary">{t.at}</span>
                <span className="text-base text-slate-800">
                  {t.label}
                  {"marker" in t && (
                    <span className="mt-1 block text-base font-semibold text-shift-blue">TrustLoop can thiệp tại đây</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-lg font-semibold text-emerald-900">
            Không lệnh nào rời ví · người kế tiếp được cảnh báo
          </p>
        </article>
      </section>

      <section className="flex flex-col items-start gap-3">
        <button
          type="button"
          onClick={() => router.push(`/story?session=${newSessionSlug()}`)}
          className="inline-flex min-h-[52px] items-center rounded-lg bg-momo-primary px-6 text-lg font-semibold text-white hover:bg-shift-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
        >
          Xem chuyện xảy ra thế nào →
        </button>
        <button
          type="button"
          onClick={() => router.push(`/shield?session=${newSessionSlug()}`)}
          className="text-base font-medium text-shift-blue underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue"
        >
          Hoặc tự thử với ảnh của bạn
        </button>
        <p className="text-base text-slate-600">
          Bổ sung cho cảnh báo liên ngân hàng SIMO và các lớp bảo vệ sẵn có của ví — không thay thế.
        </p>
      </section>

      {/* Technical mode only: system status and demo reset */}
      <section className="tech-only space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p>
          DB: <strong>{health?.db ?? "…"}</strong> · LLM: <strong>{health?.llm.backend ?? "…"}</strong>{" "}
          ({health?.llm.configured ? "đã cấu hình" : "chưa cấu hình"}) · vision <code>{health?.llm.vision_model}</code> ·
          reasoning <code>{health?.llm.reasoning_model}</code>
        </p>
        <p>
          Phiên: <code>{session?.sessionId ?? "…"}</code> · Kịch bản: {session?.cases.length ?? 0}
        </p>
        <button
          type="button"
          onClick={() => void handleResetDemo()}
          disabled={resetting}
          className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 px-3 font-medium hover:bg-slate-100 disabled:opacity-60"
        >
          {resetting ? "Đang khôi phục…" : "Khôi phục dữ liệu demo"}
        </button>
        {statusMessage && <p role="status">{statusMessage}</p>}
      </section>
    </div>
  );
}
