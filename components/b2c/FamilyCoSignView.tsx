"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  EyeOff,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  DEMO_SIMULATION_LABEL,
  type FamilyEscalateResponse,
  type FamilyHoldDto,
  type FamilyHoldsResponse,
} from "@/contracts";
import {
  RISK_LEVEL_META,
  TX_STATUS_META,
  formatDateTimeVi,
  formatVnd,
  parseApiErrorMessage,
} from "./labels";

export function FamilyCoSignView() {
  const [holds, setHolds] = useState<FamilyHoldDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [escalatingTxId, setEscalatingTxId] = useState<string | null>(null);
  const [escalatedCases, setEscalatedCases] = useState<Record<string, string>>({});
  const [callDialogTx, setCallDialogTx] = useState<FamilyHoldDto | null>(null);

  const loadHolds = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/shield/family/holds", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(parseApiErrorMessage(res.status, data));
        return;
      }
      setHolds((data as FamilyHoldsResponse).holds ?? []);
    } catch {
      setErrorMessage("Không thể tải danh sách giao dịch tạm giữ từ máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHolds();
  }, [loadHolds]);

  async function handleEscalate(txId: string) {
    setEscalatingTxId(txId);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/shield/family/escalate/${txId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: "FAMILY_MINH",
          note: "Chị Minh xác nhận tạm giữ 24h và chuyển đội MoMo Risk kiểm tra.",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMessage(parseApiErrorMessage(res.status, data));
        return;
      }
      const escalated = data as FamilyEscalateResponse;
      setEscalatedCases((prev) => ({ ...prev, [txId]: escalated.caseId }));
      await loadHolds();
    } catch {
      setErrorMessage("Lỗi kết nối khi chuyển hồ sơ sang MoMo Risk.");
    } finally {
      setEscalatingTxId(null);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl bg-[#FAF7F9] p-4 sm:p-6">
      {/* Header */}
      <section
        aria-labelledby="family-heading"
        className="space-y-4 rounded-2xl border border-momo-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-momo-600 text-white shadow-sm">
              <Users className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="family-heading" className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                  Người giám hộ — Chị Minh (FAMILY_MINH)
                </h1>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {DEMO_SIMULATION_LABEL}
                </span>
              </div>
              <p className="text-sm text-slate-600 sm:text-base">
                Không gian 1 màn hình giúp người thân cùng bảo vệ giao dịch rủi ro cao khi người
                dùng đã bật Bảo vệ 24h.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadHolds()}
              disabled={loading}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
            <Link
              href="/shield"
              className="inline-flex min-h-[48px] items-center rounded-xl border border-momo-200 bg-momo-50 px-4 py-2 text-sm font-semibold text-momo-800 hover:bg-momo-100"
            >
              ← Về B2C Phút 00
            </Link>
          </div>
        </div>

        {/* Prominent Law 91/2025 Privacy Guarantee Banner */}
        <div
          role="note"
          className="flex items-start gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-950"
        >
          <EyeOff className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
          <p className="text-base font-bold leading-relaxed">
            Chế độ bảo vệ quyền riêng tư: Ẩn hoàn toàn số dư ví, CCCD, SĐT và lịch sử chi tiêu
            thường ngày của người thân.
          </p>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900 sm:text-base"
        >
          {errorMessage}
        </div>
      )}

      {/* Reassuring Simulated Call Dialog */}
      {callDialogTx && (
        <section
          role="dialog"
          aria-label="Gọi kiểm tra người thân mô phỏng"
          className="space-y-3 rounded-2xl border-2 border-momo-400 bg-white p-5 shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <PhoneCall className="h-6 w-6 text-momo-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">
                Gọi kiểm tra {callDialogTx.senderLabel} ({DEMO_SIMULATION_LABEL})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCallDialogTx(null)}
              className="min-h-[40px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đóng hộp thoại
            </button>
          </div>
          <p className="text-base text-slate-700">
            Tiền <strong>{formatVnd(callDialogTx.amountVnd)}</strong> vẫn đang an toàn trong ví (chưa
            bị chuyển đi). Gợi ý 3 câu hỏi nhẹ nhàng, không trách móc:
          </p>
          <ul className="list-disc space-y-1.5 rounded-xl bg-momo-50/70 p-4 pl-8 text-base text-slate-900">
            <li>&ldquo;Bác/em vừa nhận được tin nhắn gấp yêu cầu chuyển khoản đúng không ạ?&rdquo;</li>
            <li>&ldquo;Người đó có dặn bác/em giữ bí mật, không được hỏi người nhà không ạ?&rdquo;</li>
            <li>
              &ldquo;Tiền vẫn còn nguyên trong ví, mình tạm giữ 24h để con/chị cùng đội an toàn
              MoMo kiểm tra giúp trước nhé.&rdquo;
            </li>
          </ul>
        </section>
      )}

      {/* Holds List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-base text-slate-600">
          Đang tải các giao dịch cần người thân xác nhận...
        </div>
      ) : holds.length === 0 ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">
            Chưa có giao dịch nào đang tạm giữ 24h
          </h2>
          <p className="mx-auto max-w-xl text-base text-slate-600">
            Để kiểm chứng: hãy vào tab <strong>B2C Phút 00</strong>, bật Opt-in Bảo vệ 24h cho Bác
            Hùng, quét <code>CASE-01</code> và bấm <strong>Tiếp tục chuyển tiền</strong>.
          </p>
          <div>
            <Link
              href="/shield"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-momo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-momo-700"
            >
              Đi tới B2C Phút 00
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {holds.map((hold) => {
            const riskMeta = hold.riskLevel ? RISK_LEVEL_META[hold.riskLevel] : null;
            const statusMeta = TX_STATUS_META[hold.status];
            const isEscalated = hold.status === "ESCALATED_TO_B2E";
            const isCancelled = hold.status === "CANCELLED_BY_USER";
            const canEscalate = hold.status === "ON_HOLD_24H";
            const createdCaseId = escalatedCases[hold.txId];

            return (
              <article
                key={hold.txId}
                className="space-y-4 rounded-2xl border border-momo-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {hold.senderLabel}
                      </h2>
                      <span
                        className={`rounded-full border px-3 py-0.5 text-xs font-bold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.labelVi}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Mã tạm giữ: <code className="font-mono">{hold.txId}</code> · Tạo lúc{" "}
                      {formatDateTimeVi(hold.createdAt)}
                    </p>
                  </div>

                  {riskMeta && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm font-extrabold ${riskMeta.badgeClass}`}
                    >
                      <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                      Rủi ro {riskMeta.labelVi}
                      {hold.riskScore !== null ? ` (${hold.riskScore}/100)` : ""}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:grid-cols-3">
                  <div>
                    <span className="block text-xs text-slate-500">Số tiền giao dịch nghi vấn</span>
                    <strong className="text-lg text-slate-900">{formatVnd(hold.amountVnd)}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Tài khoản đích</span>
                    <strong className="font-mono text-slate-900">
                      {hold.recipientAccount} ({hold.recipientBank})
                    </strong>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Thời hạn giữ an toàn</span>
                    <strong className="inline-flex items-center gap-1 text-slate-900">
                      <Clock className="h-4 w-4 text-momo-600" aria-hidden="true" />
                      {formatDateTimeVi(hold.holdExpiresAt)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-momo-100 bg-momo-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-momo-800">
                    Tóm tắt dấu hiệu Phút 00 (Đã ẩn toàn bộ CCCD / SĐT / Số dư):
                  </p>
                  <p className="text-base leading-relaxed text-slate-900">
                    {hold.sanitizedSummaryVi}
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Thông điệp hiển thị cho người thân:</strong> &ldquo;
                    {hold.neutralMessage}&rdquo;
                  </p>
                </div>

                {/* 3 Large Clear Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={!canEscalate || escalatingTxId === hold.txId}
                    onClick={() => void handleEscalate(hold.txId)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-momo-600 px-5 py-3 text-base font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    {escalatingTxId === hold.txId
                      ? "Đang chuyển MoMo Risk..."
                      : isEscalated
                        ? "Đã chuyển MoMo Risk"
                        : isCancelled
                          ? "Người thân đã tự hủy giao dịch"
                          : "Xác nhận tạm giữ 24h & Chuyển MoMo Risk"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallDialogTx(hold)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                  >
                    <PhoneCall className="h-5 w-5 text-momo-600" aria-hidden="true" />
                    Gọi kiểm tra người thân (mô phỏng)
                  </button>

                  {isEscalated && (
                    <Link
                      href="/warroom"
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-momo-600 bg-momo-50 px-5 py-3 text-base font-bold text-momo-800 transition hover:bg-momo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                    >
                      Mở ca trong B2E War-Room
                      {createdCaseId ? ` (${createdCaseId})` : ""}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
