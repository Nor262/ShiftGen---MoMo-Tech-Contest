"use client";

import Link from "next/link";
import { isReplayNotice } from "@/lib/replay-label";
import { OFFICIAL_APP_STORE_GUIDANCE_VI } from "@/lib/safety-guidance";
import { useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  EyeOff,
  FileWarning,
  HeartHandshake,
  HelpCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  PSYCH_CUE_TYPES,
  type AppealDto,
  type PersonaId,
  type PiiFieldType,
  type ShieldScanResponse,
} from "@/contracts";
import {
  CYBER_THREAT_VI,
  PSYCH_CUE_META,
  RISK_LEVEL_META,
  SCAM_CATEGORY_VI,
  formatDateTimeVi,
  formatVnd,
  parseApiErrorMessage,
} from "./labels";

interface ScanResultPanelProps {
  scan: ShieldScanResponse;
  activeUserId: PersonaId;
  onCyberReported?: (caseId: string) => void;
  /** Re-runs the same demo preset live (shown on replayed results). */
  onRunLive?: () => void;
}

const PII_FIELD_LABELS: readonly { key: PiiFieldType; label: string }[] = [
  { key: "CCCD", label: "Số CCCD" },
  { key: "PHONE", label: "Số điện thoại" },
  { key: "BALANCE", label: "Số dư ví" },
  { key: "SPENDING_HISTORY", label: "Lịch sử chi tiêu" },
];

export function ScanResultPanel({
  scan,
  activeUserId,
  onCyberReported,
  onRunLive,
}: ScanResultPanelProps) {
  const { result, piiDiff, immunityHit } = scan;
  const riskMeta = RISK_LEVEL_META[result.risk_level];

  const [showPiiDiff, setShowPiiDiff] = useState(false);
  const [cyberReporting, setCyberReporting] = useState(false);
  const [cyberReportedCaseId, setCyberReportedCaseId] = useState<string | null>(null);
  const [cyberReportError, setCyberReportError] = useState<string | null>(null);

  const [appealOpen, setAppealOpen] = useState(false);
  const [appellantName, setAppellantName] = useState("");
  const [appellantNote, setAppellantNote] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealError, setAppealError] = useState<string | null>(null);
  const [submittedAppeal, setSubmittedAppeal] = useState<AppealDto | null>(null);

  useEffect(() => {
    setCyberReportedCaseId(null);
    setCyberReportError(null);
    setAppealOpen(false);
    setAppealError(null);
    setSubmittedAppeal(null);
  }, [scan.scanId]);

  const piiCounts = PII_FIELD_LABELS.map((item) => {
    const count = piiDiff.redactions
      .filter((r) => r.field_type === item.key)
      .reduce((sum, r) => sum + r.count, 0);
    return { ...item, count };
  });

  async function handleReportCyber() {
    setCyberReporting(true);
    setCyberReportError(null);
    try {
      const res = await fetch("/api/shield/report-cyber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          scanId: scan.scanId,
          note: "Báo cáo khẩn từ B2C Phút 00: nghi vấn dụ cài .APK / Accessibility.",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCyberReportError(parseApiErrorMessage(res.status, data));
        return;
      }
      const createdId = (data as { caseId: string }).caseId;
      setCyberReportedCaseId(createdId);
      onCyberReported?.(createdId);
    } catch {
      setCyberReportError("Không thể kết nối máy chủ để gửi báo cáo War-Room.");
    } finally {
      setCyberReporting(false);
    }
  }

  async function handleAppealSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!immunityHit) return;

    const trimmedName = appellantName.trim();
    const trimmedNote = appellantNote.trim();
    if (trimmedName.length < 2) {
      setAppealError("Vui lòng nhập họ tên hoặc tên cửa hàng (tối thiểu 2 ký tự).");
      return;
    }
    if (trimmedNote.length < 5) {
      setAppealError("Vui lòng mô tả lý do khiếu nại rõ ràng (tối thiểu 5 ký tự).");
      return;
    }

    setAppealSubmitting(true);
    setAppealError(null);
    try {
      const res = await fetch(`/api/immunity/${immunityHit.indicatorId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appellantName: trimmedName,
          appellantNote: trimmedNote,
          actorId: activeUserId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAppealError(parseApiErrorMessage(res.status, data));
        return;
      }
      setSubmittedAppeal((data as { appeal: AppealDto }).appeal);
      setAppellantName("");
      setAppellantNote("");
    } catch {
      setAppealError("Lỗi kết nối khi gửi khiếu nại. Vui lòng thử lại.");
    } finally {
      setAppealSubmitting(false);
    }
  }

  const activeCueTypes = new Set(result.psych_manipulation_cues.map((c) => c.type));
  const hasEntities =
    Boolean(result.extracted_entities.recipient_account) ||
    Boolean(result.extracted_entities.recipient_bank) ||
    result.extracted_entities.amount_vnd !== null ||
    result.extracted_entities.urls.length > 0 ||
    result.extracted_entities.apk_filenames.length > 0;

  return (
    <div className="space-y-4">
      {scan.fallbackMode && isReplayNotice(scan.fallbackNoticeVi) && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
          <div className="space-y-1">
            <p className="font-semibold">Phát lại kết quả AI đã chạy thật</p>
            <p className="font-mono text-sm">{scan.fallbackNoticeVi}</p>
            <p className="text-sm">AI đang quá tải hoặc hết hạn mức nên hệ thống hiển thị lại lần chạy thật gần nhất.</p>
          </div>
          {onRunLive && (
            <button
              type="button"
              onClick={onRunLive}
              className="inline-flex min-h-[48px] items-center rounded-lg border border-momo-600 bg-white px-5 py-2 font-semibold text-momo-600 hover:bg-momo-50"
            >
              Chạy lại trực tiếp
            </button>
          )}
        </div>
      )}

      {scan.fallbackMode && !isReplayNotice(scan.fallbackNoticeVi) && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="space-y-1 text-sm sm:text-base">
            <p className="font-bold">Chế độ Dự phòng Hạn mức AI Hôm nay</p>
            <p>{scan.fallbackNoticeVi ?? "Hệ thống đang chạy kiểm tra Kho Miễn dịch & luật từ khóa."}</p>
          </div>
        </div>
      )}

      {immunityHit && (
        <section
          aria-label="Cảnh báo Miễn dịch Cộng đồng"
          className={`rounded-2xl border-2 p-5 shadow-sm ${
            immunityHit.status === "ACTIVE"
              ? "border-signal-400 bg-signal-50 text-signal-950"
              : "border-amber-400 bg-amber-50 text-amber-950"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert
                className={`mt-0.5 h-7 w-7 shrink-0 ${
                  immunityHit.status === "ACTIVE" ? "text-signal-700" : "text-amber-700"
                }`}
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h3 className="text-lg font-bold">
                  Cảnh báo từ Mạng lưới Miễn dịch MoMo TrustLoop
                </h3>
                <p className="text-sm font-medium">
                  {immunityHit.status === "ACTIVE"
                    ? "Cấp độ: Cảnh báo rủi ro cao (Đã duyệt 2 cấp Maker–Checker)"
                    : immunityHit.status === "SOFT_WARNING"
                      ? "Cấp độ: Cảnh báo mềm (1 nguồn · tham khảo không chặn cứng)"
                      : `Trạng thái chỉ báo: ${immunityHit.status}`}
                </p>
              </div>
            </div>

            <span className="rounded-full border border-current/30 bg-white/80 px-3 py-1 text-xs font-bold">
              {scan.immunityTierMatched === "TIER_1_PRE_VISION"
                ? "Khớp Tầng 1 (Trước Vision)"
                : "Khớp Tầng 2 (Sau trích xuất)"}
            </span>
          </div>

          <div className="mt-3 grid gap-2 rounded-xl bg-white/80 p-3.5 text-sm sm:grid-cols-3">
            <div>
              <span className="block text-xs text-slate-500">Chỉ báo trùng khớp</span>
              <strong className="font-mono text-slate-900">
                {immunityHit.indicatorType}: {maskIndicatorValue(immunityHit.indicatorType, immunityHit.indicatorValue)}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Nguồn xác minh độc lập</span>
              {/* Q37: B2C sees only the count — source names are internal (no STR disclosure, AML Art. 40.2). */}
              <strong className="text-slate-900">
                Dấu hiệu rủi ro cao · {immunityHit.evidenceSources.length} nguồn
              </strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Hiệu lực TTL đến</span>
              <strong className="text-slate-900">
                {formatDateTimeVi(immunityHit.expiresAt)}
              </strong>
              <span className="block text-xs text-slate-600">
                ({immunityHit.ttlHours} giờ)
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAppealOpen((prev) => !prev)}
              className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            >
              {appealOpen ? "Ẩn biểu mẫu khiếu nại" : "Gửi khiếu nại xem xét lại (TT 53/2026)"}
            </button>
          </div>

          {appealOpen && (
            <form
              onSubmit={(e) => void handleAppealSubmit(e)}
              className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900"
            >
              <p className="text-sm font-semibold text-slate-800">
                Yêu cầu con người rà soát lại chỉ báo (Thông tư 53/2026/TT-NHNN)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Tên người / hộ kinh doanh khiếu nại</span>
                  <input
                    type="text"
                    value={appellantName}
                    onChange={(e) => setAppellantName(e.target.value)}
                    placeholder="VD: Chủ TK 990123456789 (Mô phỏng)"
                    required
                    minLength={2}
                    maxLength={120}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Lý do & chứng từ đối soát</span>
                  <input
                    type="text"
                    value={appellantNote}
                    onChange={(e) => setAppellantNote(e.target.value)}
                    placeholder="VD: Giao dịch bán hàng hợp lệ, đề nghị rà soát lại"
                    required
                    minLength={5}
                    maxLength={1500}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                  />
                </label>
              </div>
              {appealError && (
                <p role="alert" className="text-sm font-medium text-red-700">
                  {appealError}
                </p>
              )}
              {submittedAppeal && (
                <p
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900"
                >
                  Đã tiếp nhận khiếu nại <code>{submittedAppeal.appealId}</code> (Trạng thái:{" "}
                  <strong>{submittedAppeal.status}</strong>). Checker sẽ trực tiếp rà soát tại tab{" "}
                  <Link href="/checker" className="underline">
                    Checker &amp; Miễn dịch
                  </Link>
                  .
                </p>
              )}
              <button
                type="submit"
                disabled={appealSubmitting}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-momo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {appealSubmitting ? "Đang gửi khiếu nại..." : "Gửi đơn khiếu nại cho Người thật"}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Main 2-Layer Analysis Card */}
      <section
        aria-label="Kết quả phân tích Phút 00"
        className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${riskMeta.borderClass}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm font-extrabold ${riskMeta.badgeClass}`}
              >
                {result.risk_level === "LOW" ? (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <AlertOctagon className="h-4 w-4" aria-hidden="true" />
                )}
                Mức rủi ro: {riskMeta.labelVi} ({result.risk_score}/100)
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {SCAM_CATEGORY_VI[result.scam_category]}
              </span>
            </div>

            {/* Progress Gauge */}
            <div className="w-full max-w-md space-y-1">
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={result.risk_score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Điểm rủi ro Phút 00"
              >
                <div
                  className={`h-full transition-all duration-300 ${riskMeta.barClass}`}
                  style={{ width: `${result.risk_score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Honest Real Telemetry */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-momo-600" aria-hidden="true" />
              Thực đo: <strong className="text-slate-900">{scan.measuredLatencyMs} ms</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
              <Cpu className="h-3.5 w-3.5 text-momo-600" aria-hidden="true" />
              Model: <strong className="font-mono text-slate-900">{scan.modelUsed}</strong>
            </span>
          </div>
        </div>

        {result.status === "INCONCLUSIVE" && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-base text-amber-950"
          >
            <strong>Chưa đủ rõ nét để kết luận (INCONCLUSIVE):</strong> Ảnh chưa thể hiện đủ nội
            dung hội thoại hoặc thông tin giao dịch. Vui lòng chụp lại rõ chữ hoặc nhập trực tiếp
            số tài khoản/đường dẫn cần kiểm tra.
          </div>
        )}

        {/* Prominent Android Device-Safety Warning when cyber_threat_flags present */}
        {result.cyber_threat_flags.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border-2 border-signal-400 bg-signal-50 p-5 text-signal-950"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-7 w-7 shrink-0 text-signal-700" aria-hidden="true" />
                <div className="space-y-1">
                  <h4 className="text-lg font-extrabold text-signal-900">
                    Cảnh báo An toàn Thiết bị Android — Nguy cơ Mã độc .APK
                  </h4>
                  <p className="text-base leading-relaxed">
                    <strong>Tuyệt đối KHÔNG tải file .apk gửi qua tin nhắn</strong> và{" "}
                    <strong>KHÔNG bật quyền Trợ năng (Accessibility Services)</strong> theo hướng
                    dẫn qua tin nhắn để tránh bị chiếm quyền điều khiển điện thoại và đọc mã OTP.
                  </p>
                  <p className="text-base font-semibold leading-relaxed">{OFFICIAL_APP_STORE_GUIDANCE_VI}</p>
                </div>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {result.cyber_threat_flags.map((flag, idx) => (
                <li
                  key={`${flag.type}-${idx}`}
                  className="rounded-xl border border-signal-200 bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-signal-100 px-2 py-0.5 text-xs font-bold text-signal-800">
                      {CYBER_THREAT_VI[flag.type]}
                    </span>
                    <code className="font-mono text-xs text-slate-800">{flag.indicator}</code>
                  </div>
                  <p className="mt-1 text-slate-700">{flag.detail_vi}</p>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleReportCyber()}
                disabled={cyberReporting || Boolean(cyberReportedCaseId)}
                className="min-h-[48px] rounded-lg bg-momo-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {cyberReporting
                  ? "Đang gửi War-Room..."
                  : cyberReportedCaseId
                    ? "Đã gửi báo cáo sang War-Room"
                    : "Báo cáo link/APK độc hại sang War-Room"}
              </button>

              {cyberReportedCaseId && (
                <span role="status" className="text-sm font-semibold text-slate-900">
                  Đã tạo hồ sơ <code>{cyberReportedCaseId}</code> (đã ẩn PII).{" "}
                  <Link href="/warroom" className="underline">
                    Mở B2E War-Room →
                  </Link>
                </span>
              )}
            </div>
            {cyberReportError && (
              <p role="alert" className="mt-2 text-sm font-semibold text-red-800">
                {cyberReportError}
              </p>
            )}
          </div>
        )}

        {/* Warm Elderly-Friendly Calm Guidance + 2 De-escalation Questions */}
        <div className="mt-5 rounded-2xl border border-momo-200 bg-momo-50/70 p-5">
          <div className="flex items-start gap-3">
            <HeartHandshake
              className="mt-0.5 h-6 w-6 shrink-0 text-momo-600"
              aria-hidden="true"
            />
            <div className="space-y-3">
              <h4 className="text-base font-bold text-momo-900">
                Lời khuyên bình tĩnh dành cho bạn
              </h4>
              <p className="text-base leading-relaxed text-slate-900 sm:text-lg">
                {result.calm_guidance_vi}
              </p>

              {result.deescalation_questions_vi.length > 0 && (
                <div className="space-y-2 rounded-xl border border-momo-200/80 bg-white p-4">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-momo-800">
                    <HelpCircle className="h-4 w-4" aria-hidden="true" />2 câu hỏi tự kiểm chứng
                    trước khi chuyển tiền:
                  </p>
                  <ul className="list-disc space-y-1.5 pl-5 text-base text-slate-800">
                    {result.deescalation_questions_vi.slice(0, 2).map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Psychological Manipulation Cues (All 4 chips) + Visual Tampering */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="text-sm font-bold text-slate-900">
              4 Dấu hiệu Thao túng Tâm lý (Phân tích Ngữ cảnh)
            </h4>
            <div className="flex flex-wrap gap-2">
              {PSYCH_CUE_TYPES.map((cueType) => {
                const active = activeCueTypes.has(cueType);
                return (
                  <span
                    key={cueType}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      active
                        ? "border-signal-300 bg-signal-100 text-signal-900"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {active ? "Phát hiện: " : ""}
                    {PSYCH_CUE_META[cueType].labelVi}
                  </span>
                );
              })}
            </div>

            {result.psych_manipulation_cues.length > 0 ? (
              <ul className="space-y-2">
                {result.psych_manipulation_cues.map((cue, idx) => (
                  <li
                    key={`${cue.type}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <p className="font-semibold text-slate-900">
                      {PSYCH_CUE_META[cue.type].labelVi}
                    </p>
                    <p className="mt-1 italic text-slate-700">&ldquo;{cue.quote_vi}&rdquo;</p>
                    <p className="mt-1 text-slate-600">{cue.explanation_vi}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Không phát hiện dấu hiệu gây sợ hãi, ép buộc hay cô lập người thân.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <FileWarning className="h-4 w-4 text-momo-600" aria-hidden="true" />
              Dấu hiệu Chỉnh sửa Ảnh &amp; Thực thể Trích xuất
            </h4>

            {result.visual_tampering_flags.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                {result.visual_tampering_flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Không ghi nhận dấu hiệu cắt ghép/chỉnh sửa văn bản bất thường trên ảnh.
              </p>
            )}

            {hasEntities && (
              <dl className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm sm:grid-cols-2">
                {result.extracted_entities.recipient_account && (
                  <div>
                    <dt className="text-xs text-slate-500">Số tài khoản đích</dt>
                    <dd className="font-mono font-semibold text-slate-900">
                      {result.extracted_entities.recipient_account}
                    </dd>
                  </div>
                )}
                {result.extracted_entities.recipient_bank && (
                  <div>
                    <dt className="text-xs text-slate-500">Ngân hàng / Ví đích</dt>
                    <dd className="font-semibold text-slate-900">
                      {result.extracted_entities.recipient_bank}
                    </dd>
                  </div>
                )}
                {result.extracted_entities.amount_vnd !== null && (
                  <div>
                    <dt className="text-xs text-slate-500">Số tiền đề cập</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatVnd(result.extracted_entities.amount_vnd)}
                    </dd>
                  </div>
                )}
                {result.extracted_entities.urls.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500">URL / Tên miền trích xuất</dt>
                    <dd className="break-all font-mono text-xs text-signal-800">
                      {result.extracted_entities.urls.join(", ")}
                    </dd>
                  </div>
                )}
                {result.extracted_entities.apk_filenames.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500">Tệp .APK phát hiện</dt>
                    <dd className="font-mono text-xs font-bold text-signal-800">
                      {result.extracted_entities.apk_filenames.join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>

        {/* Collapsible PII Redaction Diff Panel (Law 91/2025) */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50">
          <button
            type="button"
            aria-expanded={showPiiDiff}
            onClick={() => setShowPiiDiff((prev) => !prev)}
            className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
          >
            <span className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-momo-600" aria-hidden="true" />
              Xem đối chiếu Trước/Sau ẩn PII (Luật 91/2025) — Đã ẩn {piiDiff.total_redacted} mục
            </span>
            {showPiiDiff ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
          </button>

          {showPiiDiff && (
            <div className="space-y-4 border-t border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {piiCounts.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="block text-slate-500">{item.label}</span>
                    <strong className="text-sm text-slate-900">{item.count} đã ẩn</strong>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Trước khi ẩn PII (Chỉ xử lý tạm thời)
                  </p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800">
                    {piiDiff.before_sample}
                  </pre>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Sau khi ẩn PII (Bản gửi Family / War-Room)
                  </p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 font-mono text-xs text-emerald-950">
                    {piiDiff.after_sample}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Luật 91: show only part of a personal identifier (account/phone/device); domains & APK hashes stay readable. */
function maskIndicatorValue(type: string, value: string): string {
  if (type === "URL_DOMAIN" || type === "APK_HASH" || value.length <= 4) return value;
  return `${"•".repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}`;
}
