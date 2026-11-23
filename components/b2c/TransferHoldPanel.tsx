"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  DEMO_SIMULATION_LABEL,
  HIGH_RISK_HOLD_THRESHOLD,
  NEUTRAL_HOLD_MESSAGE,
  type HeldTransactionDto,
  type PersonaId,
  type ShieldScanResponse,
  type TransferResponse,
} from "@/contracts";
import {
  SCAM_CATEGORY_VI,
  TX_STATUS_META,
  formatDateTimeVi,
  formatVnd,
  parseApiErrorMessage,
} from "./labels";
import { CAST } from "@/lib/cast";
import { PoliceReportGuide } from "./PoliceReportGuide";

interface TransferHoldPanelProps {
  activeUserId: PersonaId;
  senderLabel: string;
  optIn24hHold: boolean;
  latestScan: ShieldScanResponse | null;
  holds: HeldTransactionDto[];
  onEnableOptInNow: () => Promise<boolean>;
  onHoldsChanged: () => Promise<void>;
}

export function TransferHoldPanel({
  activeUserId,
  senderLabel,
  optIn24hHold,
  latestScan,
  holds,
  onEnableOptInNow,
  onHoldsChanged,
}: TransferHoldPanelProps) {
  const [recipientAccount, setRecipientAccount] = useState("990123456789");
  const [recipientBank, setRecipientBank] = useState("NGAN_HANG_MO_PHONG_X");
  const [amountVnd, setAmountVnd] = useState("9500000");

  const [submitting, setSubmitting] = useState(false);
  const [enablingOptIn, setEnablingOptIn] = useState(false);
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null);
  const [reviewingTxId, setReviewingTxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestTransfer, setLatestTransfer] = useState<TransferResponse | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    if (!latestScan) return;
    const entities = latestScan.result.extracted_entities;
    if (entities.recipient_account) {
      setRecipientAccount(entities.recipient_account);
    }
    if (entities.recipient_bank) {
      setRecipientBank(entities.recipient_bank);
    }
    if (entities.amount_vnd !== null && entities.amount_vnd > 0) {
      setAmountVnd(String(Math.round(entities.amount_vnd)));
    }
    setErrorMessage(null);
  }, [latestScan]);

  const isHighRiskScan = Boolean(
    latestScan &&
      (latestScan.result.risk_score >= HIGH_RISK_HOLD_THRESHOLD ||
        latestScan.immunityHit?.status === "ACTIVE"),
  );

  const activeHoldRecord =
    (latestTransfer?.status === "ON_HOLD_24H"
      ? holds.find((h) => h.txId === latestTransfer.txId) ?? latestTransfer.transaction
      : null) ??
    holds.find((h) => h.status === "ON_HOLD_24H") ??
    null;

  async function handleEnableOptIn() {
    setEnablingOptIn(true);
    setErrorMessage(null);
    const ok = await onEnableOptInNow();
    if (ok) {
      setStatusNote(
        `Đã bật chế độ Bảo vệ 24h và liên kết Người giám hộ ${CAST.FAMILY_MINH.name}. Bạn có thể bấm Tiếp tục chuyển tiền để kiểm chứng giữ chậm an toàn.`,
      );
    }
    setEnablingOptIn(false);
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setStatusNote(null);

    const parsedAmount = Number(amountVnd);
    if (!recipientAccount.trim() || recipientAccount.trim().length < 3) {
      setErrorMessage("Vui lòng nhập số tài khoản nhận (tối thiểu 3 ký tự).");
      return;
    }
    if (!recipientBank.trim()) {
      setErrorMessage("Vui lòng nhập tên ngân hàng / ví nhận.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/shield/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          senderLabel,
          scanId: latestScan?.scanId ?? null,
          recipientAccount: recipientAccount.trim(),
          recipientBank: recipientBank.trim(),
          amountVnd: parsedAmount,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(parseApiErrorMessage(res.status, data));
        return;
      }
      setLatestTransfer(data as TransferResponse);
      await onHoldsChanged();
    } catch {
      setErrorMessage("Không thể kết nối máy chủ để thực hiện giao dịch mô phỏng.");
    } finally {
      setSubmitting(false);
    }
  }

  const [cancelledByUser, setCancelledByUser] = useState(false);

  async function handleCancelHold(txId: string) {
    setCancellingTxId(txId);
    setErrorMessage(null);
    setStatusNote(null);
    try {
      const res = await fetch(`/api/shield/transfer/${txId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          reason: "Người dùng tự xác nhận hủy giao dịch sau khi đọc cảnh báo Phút 00.",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(parseApiErrorMessage(res.status, data));
        return;
      }
      if (latestTransfer?.txId === txId) {
        setLatestTransfer(null);
      }
      setCancelledByUser(true);
      setStatusNote(
        `Đã hủy giao dịch ${txId} và hoàn tiền ngay về ví mô phỏng. Tài khoản được bảo toàn 100%.`,
      );
      await onHoldsChanged();
    } catch {
      setErrorMessage("Không thể kết nối máy chủ khi hủy giao dịch.");
    } finally {
      setCancellingTxId(null);
    }
  }

  // Glossary "Yêu cầu xét lại tạm giữ": owner asks a human B2E reviewer; only a human may release early (TT 53).
  async function handleRequestReview(txId: string) {
    setReviewingTxId(txId);
    setErrorMessage(null);
    setStatusNote(null);
    try {
      const res = await fetch(`/api/shield/family/escalate/${txId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: activeUserId,
          note: "Chủ ví yêu cầu chuyên viên người thật xem xét lại quyết định tạm giữ tự động.",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(parseApiErrorMessage(res.status, data));
        return;
      }
      setStatusNote(
        "Đã gửi yêu cầu xét lại. Chuyên viên người thật sẽ xem xét; giao dịch vẫn được giữ cho tới khi có kết quả.",
      );
      await onHoldsChanged();
    } catch {
      setErrorMessage("Không thể kết nối máy chủ khi gửi yêu cầu xét lại.");
    } finally {
      setReviewingTxId(null);
    }
  }

  const triggeredReasons: string[] = [];
  if (latestScan) {
    if (latestScan.result.risk_score >= HIGH_RISK_HOLD_THRESHOLD) {
      triggeredReasons.push(
        `Điểm rủi ro Phút 00 đạt ${latestScan.result.risk_score}/100 (${SCAM_CATEGORY_VI[latestScan.result.scam_category]})`,
      );
    }
    if (latestScan.immunityHit) {
      triggeredReasons.push(
        `Trùng khớp Kho Miễn dịch (${latestScan.immunityHit.indicatorType}: ${latestScan.immunityHit.indicatorValue})`,
      );
    }
    for (const cue of latestScan.result.psych_manipulation_cues.slice(0, 2)) {
      triggeredReasons.push(cue.explanation_vi);
    }
  }

  return (
    <section
      aria-labelledby="transfer-hold-heading"
      className="space-y-5 rounded-2xl border border-momo-100 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Wallet className="h-6 w-6 text-momo-600" aria-hidden="true" />
          <div>
            <h2 id="transfer-hold-heading" className="text-lg font-bold text-slate-900">
              Chuyển tiền Mô phỏng &amp; Tạm giữ Bảo mật 24h Minh bạch
            </h2>
            <p className="text-sm text-slate-600">
              Kiểm chứng cơ chế giữ chậm 24h Opt-in với thông điệp trung thực ({DEMO_SIMULATION_LABEL}).
            </p>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            optIn24hHold
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-slate-300 bg-slate-100 text-slate-700"
          }`}
        >
          {optIn24hHold ? "Bảo vệ 24h: ĐANG BẬT" : "Bảo vệ 24h: ĐANG TẮT"}
        </span>
      </div>

      {/* Warning & 1-click Opt-in helper when high risk and not yet opted in */}
      {isHighRiskScan && !optIn24hHold && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="text-sm sm:text-base">
              <p className="font-bold">
                Phát hiện rủi ro cao nhưng bạn chưa bật chế độ Bảo vệ 24h!
              </p>
              <p className="text-sm text-amber-900">
                Theo Luật 91/2025, hệ thống không tự bật ngầm. Hãy bật tự nguyện nếu muốn tạm giữ 24h
                và báo người thân ({CAST.FAMILY_MINH.name}) kiểm tra trước khi tiền rời ví.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleEnableOptIn()}
            disabled={enablingOptIn}
            className="min-h-[48px] rounded-lg bg-momo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
          >
            {enablingOptIn ? "Đang bật..." : "Bật Bảo vệ 24h ngay cho giao dịch này"}
          </button>
        </div>
      )}

      {/* Transfer Form */}
      <form onSubmit={(e) => void handleTransferSubmit(e)} className="grid gap-4 sm:grid-cols-4">
        <label className="block space-y-1 text-sm sm:col-span-1">
          <span className="font-semibold text-slate-800">Số tài khoản nhận</span>
          <input
            type="text"
            value={recipientAccount}
            onChange={(e) => setRecipientAccount(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            required
          />
        </label>

        <label className="block space-y-1 text-sm sm:col-span-1">
          <span className="font-semibold text-slate-800">Ngân hàng / Ví</span>
          <input
            type="text"
            value={recipientBank}
            onChange={(e) => setRecipientBank(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            required
          />
        </label>

        <label className="block space-y-1 text-sm sm:col-span-1">
          <span className="font-semibold text-slate-800">Số tiền (VNĐ)</span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={amountVnd}
            onChange={(e) => setAmountVnd(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            required
          />
        </label>

        <div className="flex items-end sm:col-span-1">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[48px] w-full rounded-lg bg-momo-600 px-4 py-2.5 text-base font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
          >
            {submitting ? "Đang xử lý..." : "Tiếp tục chuyển tiền"}
          </button>
        </div>
      </form>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {errorMessage}
        </p>
      )}

      {statusNote && (
        <p
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          {statusNote}
        </p>
      )}

      {/* Non-hold completed receipt */}
      {latestTransfer && latestTransfer.status === "COMPLETED" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div className="space-y-1 text-sm sm:text-base">
            <p className="font-bold">
              Giao dịch mô phỏng hoàn tất ({formatVnd(latestTransfer.transaction.amountVnd)})
            </p>
            <p>{latestTransfer.neutralMessage}</p>
          </div>
        </div>
      )}

      {/* Honest Neutral 24h Hold Receipt Card */}
      {activeHoldRecord && activeHoldRecord.status === "ON_HOLD_24H" && (
        <div
          role="region"
          aria-label="Biên nhận Tạm giữ Bảo mật 24h"
          className="space-y-4 rounded-lg border-l-4 border-signal-700 bg-signal-50 p-5 text-slate-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-6 w-6 shrink-0 text-signal-700" aria-hidden="true" />
              <div className="space-y-1">
                <span className="inline-block rounded-full bg-signal-100 px-2.5 py-0.5 text-xs font-bold text-signal-900">
                  ĐANG TẠM GIỮ ({DEMO_SIMULATION_LABEL})<span className="tech-only"> · ON_HOLD_24H</span>
                </span>
                <p
                  data-testid="neutral-hold-message"
                  className="text-base font-bold leading-relaxed text-slate-900 sm:text-lg"
                >
                  {activeHoldRecord.neutralMessage || NEUTRAL_HOLD_MESSAGE}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-amber-200 bg-white p-4 text-sm sm:grid-cols-3">
            <div>
              <span className="block text-xs text-slate-500">Số tiền được bảo toàn trong ví</span>
              <strong className="text-base text-slate-900">
                {formatVnd(activeHoldRecord.amountVnd)}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Tài khoản đích nghi vấn</span>
              <strong className="font-mono text-slate-900">
                {activeHoldRecord.recipientAccount} ({activeHoldRecord.recipientBank})
              </strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Hết hạn tạm giữ sau 24h</span>
              <strong className="inline-flex items-center gap-1 text-slate-900">
                <Clock className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                {formatDateTimeVi(activeHoldRecord.holdExpiresAt)}
              </strong>
            </div>
          </div>

          {triggeredReasons.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-white p-4 text-sm">
              <p className="font-bold text-slate-900">
                Dấu hiệu rủi ro đã kích hoạt giữ chậm bảo vệ:
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700">
                {triggeredReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCancelHold(activeHoldRecord.txId)}
              disabled={cancellingTxId === activeHoldRecord.txId}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-momo-600 px-5 py-3 text-base font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              {cancellingTxId === activeHoldRecord.txId
                ? "Đang hủy giao dịch..."
                : "Hủy giao dịch — Hoàn tiền về ví ngay"}
            </button>

            <button
              type="button"
              onClick={() => void handleRequestReview(activeHoldRecord.txId)}
              disabled={reviewingTxId === activeHoldRecord.txId}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
            >
              {reviewingTxId === activeHoldRecord.txId
                ? "Đang gửi yêu cầu..."
                : "Yêu cầu người thật xem xét lại"}
            </button>

            <Link
              href="/family"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-momo-300 bg-white px-5 py-3 text-base font-semibold text-momo-700 transition hover:bg-momo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            >
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              Mở màn hình Người giám hộ ({CAST.FAMILY_MINH.name})
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Session Transaction & Hold History */}
      {holds.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-slate-900">
            Giao dịch &amp; Lệnh tạm giữ gần đây trong phiên ({holds.length})
          </h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
            {holds.map((tx) => {
              const statusMeta = TX_STATUS_META[tx.status];
              return (
                <li
                  key={tx.txId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-slate-900">{formatVnd(tx.amountVnd)}</strong>
                      <span className="text-slate-600">→</span>
                      <code className="font-mono text-xs font-semibold text-slate-800">
                        {tx.recipientAccount}
                      </code>
                      <span className="text-xs text-slate-500">({tx.recipientBank})</span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.labelVi}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {tx.senderLabel} · {formatDateTimeVi(tx.createdAt)}
                      {tx.status === "ON_HOLD_24H" ? ` · ${tx.neutralMessage}` : ""}
                    </p>
                  </div>

                  {tx.status === "ON_HOLD_24H" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href="/family"
                        className="inline-flex min-h-[48px] items-center rounded-lg border border-momo-200 bg-white px-4 py-2 text-sm font-semibold text-momo-700 hover:bg-momo-50"
                      >
                        Xem màn hình Người giám hộ
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCancelHold(tx.txId)}
                        disabled={cancellingTxId === tx.txId}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {cancellingTxId === tx.txId
                          ? "Đang hủy..."
                          : "Hủy giao dịch — Hoàn tiền về ví ngay"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {cancelledByUser && <PoliceReportGuide scan={latestScan} txStatus="CANCELLED_BY_USER" />}
    </section>
  );
}
