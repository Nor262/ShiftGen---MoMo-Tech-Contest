"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DEMO_STEPS } from "@/components/DemoStepBar";
import {
  DEMO_SIMULATION_LABEL,
  NEUTRAL_HOLD_MESSAGE,
  type HealthResponse,
  type SessionResponse,
} from "@/contracts";

/** DESIGN.md "Minute Timeline": the product idea is the visual. */
const TIMELINE = [
  { at: "Phút 00", label: "Nghi ngờ một tin nhắn hoặc đường link", tone: "signal" },
  { at: "Phút 00–88", label: "Điểm mù ngoài ứng dụng (Zalo, cuộc gọi, mạng xã hội)", tone: "muted" },
  { at: "Phút 89", label: "Mở ví để chuyển tiền", tone: "muted" },
  { at: "Phút 90+", label: "Tiền đã rời ví và bị tẩu tán", tone: "muted" },
] as const;

// Step titles come from the guided demo bar so home and bar never drift apart.
const LOOP = [
  { n: 1, title: DEMO_STEPS[0].title, body: "AI đọc ảnh chat, chỉ ra dấu hiệu thao túng và tạm giữ giao dịch rủi ro theo chế độ Bác đã tự bật." },
  { n: 2, title: DEMO_STEPS[1].title, body: "Con gái nhận thẻ đã ẩn thông tin cá nhân và có thể Chuyển cấp sang đội Risk." },
  { n: 3, title: DEMO_STEPS[2].title, body: "4 agent điều tra song song, có một agent chuyên phản biện để tránh khóa oan người thật." },
  { n: 4, title: DEMO_STEPS[3].title, body: "Hai người duyệt độc lập; chỉ báo đã kích hoạt cảnh báo ngay người dùng tiếp theo." },
] as const;

function newSessionSlug(): string {
  return `demo-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

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
      <section className="grid items-center gap-8 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Chặn lừa đảo từ Phút 00 — trước khi tiền rời ví
          </h1>
          <p className="text-lg text-slate-700">
            TrustLoop đọc ảnh chat đáng ngờ trước khi bạn chuyển tiền, tạm giữ giao dịch rủi ro theo chế độ bạn tự bật,
            và biến mỗi vụ đã được con người xác minh thành lá chắn cho người dùng kế tiếp.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(`/shield?session=${newSessionSlug()}`)}
              className="inline-flex min-h-[48px] items-center rounded-lg bg-momo-600 px-5 py-3 text-base font-semibold text-white hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue"
            >
              Xem demo 3 phút: Bác Hùng →
            </button>
            <Link
              href="/shield"
              className="inline-flex min-h-[48px] items-center rounded-lg border border-momo-600 px-6 py-3 text-base font-semibold text-momo-600 hover:bg-momo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue"
            >
              Tự thử với ảnh của bạn
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            Bổ sung cho cảnh báo liên ngân hàng SIMO và các lớp bảo vệ MoMo đang có — không thay thế.
          </p>
        </div>

        {/* The one Signal surface on this page: an illustrative held transfer (DESIGN.md Hold Banner). */}
        <aside
          aria-label="Ví dụ giao dịch đang tạm giữ"
          className="space-y-3 rounded-lg border-l-4 border-signal-500 bg-white p-5 shadow-[rgba(17,26,74,.05)_0_8px_16px,rgba(17,26,74,.05)_0_4px_8px] lg:col-span-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-700">Đang tạm giữ · {DEMO_SIMULATION_LABEL}</p>
          <p className="font-mono text-2xl font-semibold text-slate-900">15.000.000đ</p>
          <p className="text-slate-700">{NEUTRAL_HOLD_MESSAGE}</p>
          <p className="text-sm text-slate-500">Bạn vẫn tự hủy được; chỉ người thật mới được giải phóng sớm.</p>
        </aside>
      </section>

      {/* Minute timeline */}
      <section aria-labelledby="timeline-title" className="space-y-4">
        <h2 id="timeline-title" className="text-2xl font-semibold">Một vụ lừa đảo diễn ra như thế nào</h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {TIMELINE.map((t) => (
            <li
              key={t.at}
              className={`rounded-lg border p-4 ${
                t.tone === "signal" ? "border-signal-200 bg-signal-50" : "border-slate-200 bg-white"
              }`}
            >
              <p className={`font-mono text-sm font-semibold ${t.tone === "signal" ? "text-signal-700" : "text-slate-500"}`}>{t.at}</p>
              <p className="mt-1 text-slate-800">{t.label}</p>
              {t.tone === "signal" && <p className="mt-2 text-sm font-semibold text-signal-700">TrustLoop can thiệp tại đây</p>}
            </li>
          ))}
        </ol>
        <p className="text-sm text-slate-600">
          Ứng dụng ví thường chỉ thấy được Phút 89. Sinh trắc học xác nhận đúng người chuyển tiền, nhưng không biết người đó đang bị thao túng.
        </p>
      </section>

      {/* Closed loop */}
      <section aria-labelledby="loop-title" className="space-y-4">
        <h2 id="loop-title" className="text-2xl font-semibold">Vòng lặp 4 bước</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((s) => (
            <li key={s.n} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-shift-blue">Bước {s.n}</p>
              <p className="mt-1 font-semibold text-slate-900">{s.title}</p>
              <p className="mt-1 text-sm text-slate-700">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-slate-600">↺ Sau bước 4, người dùng tiếp theo tra cứu cùng tài khoản sẽ được cảnh báo ngay.</p>
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
