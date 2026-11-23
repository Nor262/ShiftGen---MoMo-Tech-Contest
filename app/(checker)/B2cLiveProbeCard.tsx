"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Cpu,
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  DEMO_SIMULATION_LABEL,
  type ImmunityIndicatorDto,
  type ShieldScanResponse,
} from "@/contracts";

interface B2cLiveProbeCardProps {
  indicators: ImmunityIndicatorDto[];
  externalQuery?: string;
  externalQueryNonce?: number;
}

interface ProbeOutcome {
  query: string;
  httpStatus: number;
  scan?: ShieldScanResponse;
  errorCode?: string;
  errorMessage?: string;
}

function isUrlOrDomain(value: string): boolean {
  return /^https?:\/\//i.test(value) || /[a-z0-9-]+\.[a-z]{2,}/i.test(value);
}

function formatViDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function B2cLiveProbeCard({
  indicators,
  externalQuery,
  externalQueryNonce,
}: B2cLiveProbeCardProps) {
  const [query, setQuery] = useState("990123456789");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<ProbeOutcome | null>(null);

  useEffect(() => {
    if (externalQuery) {
      setQuery(externalQuery);
    }
  }, [externalQuery, externalQueryNonce]);

  const quickSamples = Array.from(
    new Set([
      ...indicators.map((i) => i.indicatorValue),
      "990123456789",
      "https://dichvucong-xacminh-hoso.example/capnhat.apk",
    ]),
  ).slice(0, 5);

  async function runProbe(targetValue?: string) {
    const raw = (targetValue ?? query).trim();
    if (!raw) return;

    setLoading(true);
    try {
      const looksLikeUrl = isUrlOrDomain(raw);
      const bodyPayload = looksLikeUrl
        ? {
            userId: "USER_B2C_NEW",
            inputType: "TEXT_LOOKUP",
            url: raw,
            lookupText: `Kiểm tra liên kết ${raw}`,
          }
        : {
            userId: "USER_B2C_NEW",
            inputType: "TEXT_LOOKUP",
            recipientAccount: raw,
            lookupText: `Kiểm tra số tài khoản ${raw}`,
          };

      const res = await fetch("/api/shield/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errData = data as { code?: string; error?: string } | null;
        setOutcome({
          query: raw,
          httpStatus: res.status,
          errorCode: errData?.code ?? `HTTP_${res.status}`,
          errorMessage:
            errData?.error ?? `Máy chủ trả về mã HTTP ${res.status}.`,
        });
        return;
      }

      setOutcome({
        query: raw,
        httpStatus: res.status,
        scan: data as ShieldScanResponse,
      });
    } catch {
      setOutcome({
        query: raw,
        httpStatus: 0,
        errorCode: "NETWORK_ERROR",
        errorMessage: "Không thể kết nối tới POST /api/shield/scan.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="b2c-probe-heading"
      className="rounded-2xl border border-momo-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="b2c-probe-heading" className="text-lg font-bold text-slate-900">
              Kiểm chứng Vòng lặp Khép kín B2C <span className="tech-only font-mono text-xs">(Live Probe · USER_B2C_NEW)</span>
            </h2>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {DEMO_SIMULATION_LABEL}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Gửi trực tiếp <code>POST /api/shield/scan</code> (<code>TEXT_LOOKUP</code>) với vai trò
            người dùng mới để kiểm chứng cảnh báo Miễn dịch xuất hiện sau <strong>Phê duyệt</strong>{" "}
            và biến mất ngay sau <strong>Rollback</strong> hoặc <strong>Giả lập hết hạn TTL</strong>.
          </p>
        </div>

        <Link
          href="/shield"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-momo-300 bg-momo-50 px-3.5 py-2 text-sm font-semibold text-momo-700 transition hover:bg-momo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
        >
          Mở trang B2C /shield
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runProbe();
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <label className="sr-only" htmlFor="b2c-probe-input">
          Số tài khoản hoặc URL cần kiểm chứng trên B2C Shield
        </label>
        <input
          id="b2c-probe-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập số tài khoản (VD: 990123456789) hoặc URL..."
          className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-momo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {loading ? "Đang tra cứu B2C..." : "Kiểm chứng ngay (POST /api/shield/scan)"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Gợi ý nhanh:</span>
        {quickSamples.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setQuery(sample);
              void runProbe(sample);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700 transition hover:border-momo-300 hover:bg-momo-50 hover:text-momo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
          >
            {sample}
          </button>
        ))}
      </div>

      {outcome && (
        <div className="mt-4" aria-live="polite">
          {outcome.scan ? (
            outcome.scan.immunityHit ? (
              <div
                role="status"
                className={`rounded-xl border-2 p-4 ${
                  outcome.scan.immunityHit.status === "ACTIVE"
                    ? "border-red-400 bg-red-50 text-red-950"
                    : "border-amber-400 bg-amber-50 text-amber-950"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        outcome.scan.immunityHit.status === "ACTIVE"
                          ? "text-red-700"
                          : "text-amber-700"
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-bold">
                        KHỚP MIỄN DỊCH CỘNG ĐỒNG<span className="tech-only"> ({outcome.scan.immunityHit.status})</span> —{" "}
                        <code className="font-mono">{outcome.scan.immunityHit.indicatorValue}</code>
                      </p>
                      <p className="mt-0.5 text-sm">
                        Tầng khớp: <strong>{outcome.scan.immunityTierMatched}</strong> · Điểm rủi
                        ro: <strong>{outcome.scan.result.risk_score}/100</strong> (
                        {outcome.scan.result.risk_level}) · Hết hạn TTL:{" "}
                        <strong>{formatViDateTime(outcome.scan.immunityHit.expiresAt)}</strong>
                      </p>
                      <p className="mt-1 text-xs">
                        Nguồn độc lập ({outcome.scan.immunityHit.evidenceSources.length}):{" "}
                        {outcome.scan.immunityHit.evidenceSources.join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/80 px-2.5 py-1 font-semibold">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Thực đo: {outcome.scan.measuredLatencyMs} ms
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/80 px-2.5 py-1 font-mono font-semibold">
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                      {outcome.scan.modelUsed}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                role="status"
                className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-bold">
                        KHÔNG CÒN CẢNH BÁO MIỄN DỊCH (<code>immunityHit: null</code>) cho{" "}
                        <code className="font-mono">{outcome.query}</code>
                      </p>
                      <p className="mt-0.5 text-sm">
                        Tầng khớp: <strong>{outcome.scan.immunityTierMatched}</strong> · Điểm rủi
                        ro phân tích: <strong>{outcome.scan.result.risk_score}/100</strong> (
                        {outcome.scan.result.risk_level})
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 font-semibold text-emerald-900">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Thực đo: {outcome.scan.measuredLatencyMs} ms
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 font-mono font-semibold text-emerald-900">
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                      {outcome.scan.modelUsed}
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <div className="space-y-1 text-sm">
                  <p className="font-bold">
                    {outcome.errorCode === "LLM_NOT_CONFIGURED"
                      ? `Không trùng khớp Kho Miễn dịch Tầng 1 (immunityHit: null) · HTTP 503 (${outcome.errorCode})`
                      : `HTTP ${outcome.httpStatus} · ${outcome.errorCode}`}
                  </p>
                  <p>
                    {outcome.errorCode === "LLM_NOT_CONFIGURED"
                      ? `Chỉ dấu "${outcome.query}" hiện KHÔNG còn nằm trong Danh mục Miễn dịch đang hoạt động (đã thu hồi, hết hạn TTL hoặc chưa được kích hoạt). Hệ thống đã chuyển sang phân tích AI trực tiếp nhưng chưa cấu hình khóa API LLM trên máy chủ.`
                      : outcome.errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
