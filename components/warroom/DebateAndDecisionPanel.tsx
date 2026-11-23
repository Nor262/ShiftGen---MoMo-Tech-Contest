"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  HeartHandshake,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  IMMUNITY_INDICATOR_TYPES,
  type CaseDecisionRequest,
  type CaseDecisionResponse,
  type ImmunityIndicatorType,
  type InvestigationCaseDto,
  type WarRoomDebate,
} from "@/contracts";
import {
  ANXIETY_LEVEL_META,
  INDICATOR_TYPE_LABELS,
  RECOMMENDATION_META,
  parseWarRoomApiError,
} from "./labels";

function deriveDefaultIndicator(caseRecord: InvestigationCaseDto): {
  indicatorType: ImmunityIndicatorType;
  indicatorValue: string;
} {
  const m0 = caseRecord.sanitizedMinute0;
  if (m0?.recipient_account) {
    return {
      indicatorType: "BANK_ACCOUNT",
      indicatorValue: m0.recipient_account,
    };
  }
  if (m0?.suspicious_urls && m0.suspicious_urls.length > 0) {
    const cleanUrl = m0.suspicious_urls[0].replace(/^https?:\/\//i, "");
    return {
      indicatorType: "URL_DOMAIN",
      indicatorValue: cleanUrl,
    };
  }

  const ctx = caseRecord.caseContext;
  if (typeof ctx.targetAccount === "string" && ctx.targetAccount.trim()) {
    return {
      indicatorType: "BANK_ACCOUNT",
      indicatorValue: ctx.targetAccount.trim(),
    };
  }
  if (typeof ctx.suspiciousUrl === "string" && ctx.suspiciousUrl.trim()) {
    return {
      indicatorType: "URL_DOMAIN",
      indicatorValue: ctx.suspiciousUrl.trim().replace(/^https?:\/\//i, ""),
    };
  }

  return {
    indicatorType: "BANK_ACCOUNT",
    indicatorValue: "",
  };
}

function extractContextSources(caseRecord: InvestigationCaseDto): string[] {
  const raw = caseRecord.caseContext.independentSources;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

interface DebateAndDecisionPanelProps {
  caseRecord: InvestigationCaseDto;
  debate: WarRoomDebate | null;
  synthesizing: boolean;
  onDecisionRecorded: () => Promise<void>;
}

export function DebateAndDecisionPanel({
  caseRecord,
  debate,
  synthesizing,
  onDecisionRecorded,
}: DebateAndDecisionPanelProps) {
  const defaultIndicator = useMemo(() => deriveDefaultIndicator(caseRecord), [caseRecord]);

  const [rationale, setRationale] = useState("");
  const [indicatorType, setIndicatorType] = useState<ImmunityIndicatorType>(
    defaultIndicator.indicatorType,
  );
  const [indicatorValue, setIndicatorValue] = useState(defaultIndicator.indicatorValue);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<CaseDecisionResponse | null>(null);

  useEffect(() => {
    setIndicatorType(defaultIndicator.indicatorType);
    setIndicatorValue(defaultIndicator.indicatorValue);
    setRationale("");
    setDecisionError(null);
    setDecisionResult(null);
    setCopiedIdx(null);
  }, [caseRecord.caseId, defaultIndicator.indicatorType, defaultIndicator.indicatorValue]);

  const independentSources = useMemo(() => {
    if (debate?.synthesis.independent_sources) {
      return debate.synthesis.independent_sources;
    }
    return extractContextSources(caseRecord);
  }, [caseRecord, debate]);

  const synthesis = debate?.synthesis ?? null;
  const recMeta = synthesis ? RECOMMENDATION_META[synthesis.recommendation] : null;
  const dismissHighlighted = synthesis?.recommendation === "RECOMMEND_DISMISS_FP";
  const canActiveImmunity = independentSources.length >= 2;

  async function handleCopyOpener(idx: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => {
        setCopiedIdx((prev) => (prev === idx ? null : prev));
      }, 2000);
    } catch {
      // Clipboard may be restricted in headless browser contexts; keep UI responsive
    }
  }

  async function submitDecision(
    mode: "DISMISS_FP" | "SOFT_WARNING" | "ACTIVE",
  ) {
    setDecisionError(null);
    setDecisionResult(null);

    const trimmedRationale = rationale.trim();
    if (trimmedRationale.length < 3) {
      setDecisionError("Vui lòng nhập lý do quyết định của chuyên viên (tối thiểu 3 ký tự).");
      return;
    }

    let payload: CaseDecisionRequest;

    if (mode === "DISMISS_FP") {
      payload = {
        decision: "DISMISS_FP",
        actorId: "RISK_MAKER_HUYEN",
        actorRole: "RISK_MAKER",
        rationale: trimmedRationale,
      };
    } else {
      const trimmedIndicator = indicatorValue.trim();
      if (trimmedIndicator.length < 2) {
        setDecisionError("Vui lòng nhập giá trị chỉ báo (tài khoản/tên miền, tối thiểu 2 ký tự).");
        return;
      }
      if (independentSources.length === 0) {
        setDecisionError(
          "Hồ sơ hiện có 0 nguồn bằng chứng độc lập — không thể đề xuất đưa vào Kho Miễn dịch.",
        );
        return;
      }

      payload = {
        decision: "PROPOSE_IMMUNITY",
        actorId: "RISK_MAKER_HUYEN",
        actorRole: "RISK_MAKER",
        rationale: trimmedRationale,
        indicatorType,
        indicatorValue: trimmedIndicator,
        requestedLevel: mode,
        evidenceSources: independentSources,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/warroom/cases/${encodeURIComponent(caseRecord.caseId)}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setDecisionError(parseWarRoomApiError(res.status, body));
        return;
      }

      setDecisionResult(body as CaseDecisionResponse);
      await onDecisionRecorded();
    } catch {
      setDecisionError("Lỗi kết nối khi ghi nhận quyết định Maker. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 2-Column Debate & Empathetic CSKH Handover Card */}
      <section aria-label="Tổng hợp tranh biện & Bàn giao CSKH" className="grid gap-4 xl:grid-cols-12">
        {/* Left 7 cols: 2-Column Debate Table */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-5 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-momo-400" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">
                Tranh biện 2 Chiều & Tổng hợp Trọng tài
              </h2>
            </div>

            {synthesizing && (
              <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-momo-400/50 bg-momo-500/20 px-2.5 py-0.5 text-xs font-semibold text-momo-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Đang tổng hợp tranh biện...
              </span>
            )}
            {recMeta && !synthesizing && (
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${recMeta.badgeClass}`}>
                {recMeta.labelVi}
              </span>
            )}
          </div>

          {synthesis ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {/* Risk column */}
                <div className="rounded-xl border border-red-500/30 bg-red-950/25 p-3.5">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-300">
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                    Lập luận Rủi ro
                  </h3>
                  {synthesis.risk_summary_points.length === 0 ? (
                    <p className="text-xs text-slate-400">Không ghi nhận điểm rủi ro đáng kể.</p>
                  ) : (
                    <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-200">
                      {synthesis.risk_summary_points.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Defense column */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Lập luận Bảo vệ Khách hàng thật
                  </h3>
                  {synthesis.defense_summary_points.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Không có lập luận minh oan cho hồ sơ này.
                    </p>
                  ) : (
                    <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-200">
                      {synthesis.defense_summary_points.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/75 p-3 text-xs text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">Đánh giá điều kiện Miễn dịch Lớp 2:</span>
                  <span
                    className={`rounded px-2 py-0.5 font-semibold ${
                      synthesis.eligible_for_active_immunity
                        ? "bg-red-500/20 text-red-200"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {synthesis.eligible_for_active_immunity
                      ? "Đủ điều kiện (≥ 2 nguồn độc lập)"
                      : "Chưa đủ điều kiện Lớp 2"}
                  </span>
                </div>
                <p className="mt-1.5 leading-relaxed text-slate-300">
                  {synthesis.eligibility_reason_vi}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
              Chạy <strong>Điều tra 4 Agent</strong> ở trên để xem Bảng tranh biện 2 chiều và khuyến
              nghị từ Trọng tài tổng hợp.
            </div>
          )}
        </div>

        {/* Right 5 cols: Empathetic CSKH Handover Card */}
        <div className="space-y-3 rounded-xl border border-momo-500/35 bg-gradient-to-b from-slate-900 to-slate-950 p-5 xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-momo-400" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">Thẻ Bàn giao CSKH Thấu cảm</h2>
            </div>
            {synthesis?.cskh_empathetic_card && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  ANXIETY_LEVEL_META[synthesis.cskh_empathetic_card.customer_anxiety_level]
                    .badgeClass
                }`}
              >
                {
                  ANXIETY_LEVEL_META[synthesis.cskh_empathetic_card.customer_anxiety_level]
                    .labelVi
                }
              </span>
            )}
          </div>

          {synthesis?.cskh_empathetic_card ? (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/35 p-3 text-emerald-100">
                <p className="font-semibold text-emerald-300">Trạng thái tiền của khách hàng:</p>
                <p className="mt-1 leading-relaxed">{synthesis.cskh_empathetic_card.funds_status_vi}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Câu mở đầu thấu cảm (Dành cho CSKH người thật)
                </p>
                {synthesis.cskh_empathetic_card.empathetic_openers_vi.map((opener, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5"
                  >
                    <p className="leading-relaxed text-slate-100">
                      <span className="mr-1.5 font-mono font-bold text-momo-400">
                        #{idx + 1}
                      </span>
                      {opener}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopyOpener(idx, opener)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {synthesis.cskh_empathetic_card.do_not_say_vi.length > 0 && (
                <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-300">
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                    TUYỆT ĐỐI KHÔNG NÓI (Tránh lỗi Klarna; không tiết lộ việc đã báo cáo giao dịch đáng ngờ — Luật PCRT Điều 40.2)
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-amber-100/90">
                    {synthesis.cskh_empathetic_card.do_not_say_vi.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
              Thẻ kịch bản CSKH thấu cảm (câu trấn an & danh sách điều cấm nói) sẽ xuất hiện sau
              khi hoàn tất tổng hợp 4 Agent.
            </div>
          )}
        </div>
      </section>

      {/* Human-in-the-Loop Maker Decision Controls */}
      <section
        aria-label="Quyết định của Chuyên viên Risk Maker"
        className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <UserCheck className="h-5 w-5 text-momo-400" aria-hidden="true" />
              Quyết định của Chuyên viên Risk Maker (Human-in-the-Loop · FR-06.1)
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              AI chỉ tổng hợp lập luận; <strong>Chuyên viên người thật</strong> quyết định đóng cảnh
              báo giả hoặc đề xuất vào Kho Miễn dịch (không bao giờ tự động khóa tài khoản).
            </p>
          </div>

          <span className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300">
            Actor: RISK_MAKER_HUYEN
          </span>
        </div>

        {/* Independent sources & editable indicator */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="warroom-indicator-type"
                className="mb-1 block text-xs font-semibold text-slate-200"
              >
                Loại chỉ báo (Indicator Type)
              </label>
              <select
                id="warroom-indicator-type"
                value={indicatorType}
                onChange={(e) => setIndicatorType(e.target.value as ImmunityIndicatorType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-momo-400 focus:outline-none focus:ring-2 focus:ring-momo-400/40"
              >
                {IMMUNITY_INDICATOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INDICATOR_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="warroom-indicator-value"
                className="mb-1 block text-xs font-semibold text-slate-200"
              >
                Giá trị chỉ báo (STK / Tên miền / Hash)
              </label>
              <input
                id="warroom-indicator-value"
                type="text"
                value={indicatorValue}
                onChange={(e) => setIndicatorValue(e.target.value)}
                placeholder="VD: 990123456789 hoặc dichvucong-xacminh-hoso.example/capnhat.apk"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-400 focus:border-momo-400 focus:outline-none focus:ring-2 focus:ring-momo-400/40"
              />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">
                  Nguồn bằng chứng độc lập (Independent Sources):
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-mono font-bold ${
                    canActiveImmunity
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {independentSources.length} nguồn
                </span>
              </div>
              {independentSources.length === 0 ? (
                <p className="mt-1.5 text-slate-400">
                  Chưa có nguồn bằng chứng độc lập nào (phù hợp với giao dịch hợp lệ).
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {independentSources.map((src) => (
                    <code
                      key={src}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-200"
                    >
                      {src}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between space-y-3">
            <div>
              <label
                htmlFor="warroom-maker-rationale"
                className="mb-1 block text-xs font-semibold text-slate-200"
              >
                Lý do quyết định của Chuyên viên Maker (Bắt buộc, tối thiểu 3 ký tự)
              </label>
              <textarea
                id="warroom-maker-rationale"
                rows={4}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Ghi rõ căn cứ kỹ thuật, chính sách áp dụng và kết luận rà soát của chuyên viên..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:border-momo-400 focus:outline-none focus:ring-2 focus:ring-momo-400/40"
              />
            </div>

            {!canActiveImmunity && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-xs text-amber-100">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span>
                  <strong>Khóa Lớp 2 (Active Immunity):</strong> Hiện có{" "}
                  <strong>{independentSources.length}</strong> nguồn độc lập (yêu cầu{" "}
                  <strong>≥ 2 nguồn</strong>). Bạn chỉ nên phát hành{" "}
                  <strong>Cảnh báo mềm 72h (Lớp 1)</strong> hoặc đóng cảnh báo giả; gửi đề xuất Lớp
                  2 sẽ bị máy chủ từ chối (HTTP 400).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3 Explicit Decision Buttons */}
        <div className="grid gap-3 pt-1 md:grid-cols-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitDecision("DISMISS_FP")}
            className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 ${
              dismissHighlighted
                ? "border-emerald-400 bg-emerald-600/25 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600/35"
                : "border-emerald-500/40 bg-emerald-950/35 text-emerald-100 hover:bg-emerald-950/60"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2 text-xs font-bold">
              <span>Minh oan (Dismiss FP)</span>
              {dismissHighlighted && (
                <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                  KHUYẾN NGHỊ
                </span>
              )}
            </span>
            <span className="text-[11px] text-emerald-200/85">
              Xác nhận khách hàng thật / tiểu thương hợp lệ, không khóa ví.
            </span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitDecision("SOFT_WARNING")}
            className="flex flex-col items-start gap-1 rounded-xl border border-amber-500/50 bg-amber-950/35 px-4 py-3 text-left text-amber-100 transition hover:bg-amber-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60"
          >
            <span className="text-xs font-bold">Phát hành Cảnh báo mềm (72h — Lớp 1)</span>
            <span className="text-[11px] text-amber-200/85">
              Hiệu lực tức thì 72h với 1+ nguồn; không tự chặn giao dịch.
            </span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitDecision("ACTIVE")}
            className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400 disabled:opacity-60 ${
              canActiveImmunity
                ? "border-momo-400 bg-momo-600/30 text-white hover:bg-momo-600/45"
                : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2 text-xs font-bold">
              <span>Đề xuất Cảnh báo Rủi ro Cao (Chuyển Checker — Lớp 2)</span>
              {!canActiveImmunity && (
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
              )}
            </span>
            <span className="text-[11px] text-slate-200/85">
              Yêu cầu ≥ 2 nguồn độc lập &amp; chờ Checker duyệt (Maker ≠ Checker).
            </span>
          </button>
        </div>

        {/* Error & Success Feedback */}
        {decisionError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-950/60 px-3.5 py-2.5 text-xs text-red-100"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
            <span>{decisionError}</span>
          </div>
        )}

        {(decisionResult || caseRecord.status === "IMMUNITY_PROPOSED") && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/35 px-4 py-3 text-xs text-emerald-100">
            <div className="flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-bold text-white">
                  {decisionResult
                    ? decisionResult.caseStatus === "DISMISSED_FP"
                      ? "Đã ghi nhận: Minh oan (DISMISSED_FP)"
                      : `Đã ghi nhận đề xuất Miễn dịch (${decisionResult.indicator?.status ?? "IMMUNITY_PROPOSED"})`
                    : "Hồ sơ đã được đề xuất vào Kho Miễn dịch"}
                </p>
                {decisionResult?.indicator && (
                  <p className="mt-0.5 font-mono text-[11px] text-emerald-200">
                    Indicator: {decisionResult.indicator.indicatorValue} · TTL{" "}
                    {decisionResult.indicator.ttlHours}h
                  </p>
                )}
              </div>
            </div>

            {(decisionResult?.indicator || caseRecord.status === "IMMUNITY_PROPOSED") && (
              <Link
                href="/checker"
                className="inline-flex items-center gap-1.5 rounded-lg bg-momo-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-momo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-300"
              >
                <span>Chuyển sang Checker &amp; Miễn dịch (/checker)</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
