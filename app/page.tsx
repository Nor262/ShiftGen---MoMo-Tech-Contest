"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DEMO_SIMULATION_LABEL,
  NEUTRAL_HOLD_MESSAGE,
  type HealthResponse,
  type SessionResponse,
} from "@/contracts";

const WORKSPACES = [
  {
    href: "/shield",
    title: "1. Lá chắn Phút 00 (B2C)",
    role: "USER_B2C · Bác Hùng / Minh Anh / Người dùng mới",
    description:
      "Quét ảnh chat Zalo/link .apk, đối chiếu Kho Miễn dịch 2 tầng, ẩn PII và kích hoạt Tạm giữ 24h Opt-in minh bạch.",
    wave: "Wave 1",
  },
  {
    href: "/family",
    title: "2. Người giám hộ (1 Màn hình)",
    role: "FAMILY_GUARDIAN · Chị Minh",
    description:
      "Xem thẻ cảnh báo đã ẩn CCCD/SĐT/số dư và xác nhận giữ chậm 24h hoặc đẩy khẩn sang đội Risk.",
    wave: "Wave 1",
  },
  {
    href: "/warroom",
    title: "3. FinCrime War-Room (4 Agent)",
    role: "RISK_MAKER · Chị Huyền",
    description:
      "Điều phối song song 4 AI Agent có phản biện False-Positive Defender, đồ thị dòng tiền và Thẻ CSKH Thấu cảm.",
    wave: "Wave 2",
  },
  {
    href: "/checker",
    title: "4. Checker & Miễn dịch 4 Lớp",
    role: "RISK_CHECKER · Anh Tuấn",
    description:
      "Thiết kế quản trị riêng: phê duyệt 2 cấp Maker–Checker (≥2 nguồn độc lập khác loại), thời hạn hiệu lực; khiếu nại do người thật xem xét lại (Luật AI 134 Điều 4.2, TT 53/2026) và Thu hồi tức thì.",
    wave: "Wave 3",
  },
] as const;

export default function HomePage() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const [sessRes, healthRes] = await Promise.all([
        fetch("/api/session", { cache: "no-store" }),
        fetch("/api/health", { cache: "no-store" }),
      ]);
      if (sessRes.ok) {
        setSession((await sessRes.json()) as SessionResponse);
      }
      if (healthRes.ok) {
        setHealth((await healthRes.json()) as HealthResponse);
      }
    } catch {
      setStatusMessage("Không thể tải trạng thái phiên demo.");
    } finally {
      setLoading(false);
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
      setStatusMessage(
        `Đã khôi phục phiên "${data.sessionId}" (${data.seededCasesCount} kịch bản ${DEMO_SIMULATION_LABEL}).`,
      );
      await loadState();
    } catch {
      setStatusMessage("Lỗi khi khôi phục dữ liệu phiên demo.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">
              MoMo TrustLoop v2 — Vòng lặp Phòng vệ Niềm tin Số
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Kiến trúc 3 trụ cột cứng nối liền tuyến đầu B2C Phút 00, Người giám hộ nhận thẻ đã ẩn PII,
              Phòng Tác chiến 4 Agent có phản biện và Miễn dịch Cộng đồng 4 Lớp. Toàn bộ dữ liệu
              kịch bản là <strong>{DEMO_SIMULATION_LABEL}</strong> tổng hợp 100%.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="session-badge"
              className="inline-flex items-center gap-1.5 rounded-lg border border-momo-200 bg-momo-50 px-3 py-1.5 text-xs font-semibold text-momo-700"
            >
              <span>Session:</span>
              <code className="font-mono">{session?.sessionId ?? "..."}</code>
            </span>
            <button
              type="button"
              onClick={() => void handleResetDemo()}
              disabled={resetting}
              className="rounded-lg bg-momo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
            >
              {resetting ? "Đang khôi phục..." : "Reset Demo"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="rounded-md bg-slate-100 px-2.5 py-1">
            DB: <strong>{health?.db ?? (loading ? "..." : "unknown")}</strong>
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1">
            LLM Backend: <strong>{health?.llm.backend ?? "..."}</strong> (
            {health?.llm.configured ? "đã cấu hình key" : "chưa cấu hình API key"})
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1">
            Kịch bản phiên hiện tại: <strong>{session?.cases.length ?? 0}</strong>
          </span>
        </div>

        {statusMessage && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
          >
            {statusMessage}
          </p>
        )}
      </section>

      <section aria-label="Không gian làm việc" className="grid gap-4 md:grid-cols-2">
        {WORKSPACES.map((ws) => (
          <Link
            key={ws.href}
            href={ws.href}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-momo-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 group-hover:text-momo-600">
                  {ws.title}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {ws.wave}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-momo-700">{ws.role}</p>
              <p className="mt-2 text-sm text-slate-600">{ws.description}</p>
            </div>
            <span className="mt-4 inline-flex items-center text-xs font-semibold text-momo-600">
              Mở không gian làm việc →
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Hàng đợi Kịch bản Phiên hiện tại ({DEMO_SIMULATION_LABEL})
          </h2>
          <span className="text-xs text-slate-500">
            Cách ly theo <code>?session=&lt;slug&gt;</code>
          </span>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Đang tải dữ liệu phiên...</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {(session?.cases ?? []).map((item) => (
              <li key={item.caseId} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="mr-2 rounded bg-momo-100 px-2 py-0.5 font-mono text-xs font-semibold text-momo-700">
                      {item.scenarioCode}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.subtitle}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-xs text-slate-600">
        <strong>Nguyên tắc minh bạch:</strong> Thông điệp tạm giữ 24h chuẩn hóa:{" "}
        <em>&ldquo;{NEUTRAL_HOLD_MESSAGE}&rdquo;</em> Tuyệt đối không giả danh cơ quan nhà nước.
      </footer>
    </div>
  );
}
