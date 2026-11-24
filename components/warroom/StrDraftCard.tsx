"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO_SIMULATION_LABEL, type StrStatusResponse } from "@/contracts";
import { CAST } from "@/lib/cast";

/**
 * #7: once a case has a Kết luận rủi ro cao, the War-Room shows the suspicious-transaction report
 * draft and its legal deadline. A person confirms the (simulated) submission; nothing is auto-sent.
 * This card is B2E-only; CSKH and customer screens never mention reporting (Luật PCRT Điều 40.2).
 */
export function StrDraftCard({ caseId }: { caseId: string }) {
  const [str, setStr] = useState<StrStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/warroom/cases/${encodeURIComponent(caseId)}/str`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok) setStr(data as StrStatusResponse);
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/warroom/cases/${encodeURIComponent(caseId)}/str`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error ?? "Không thể xác nhận.");
        return;
      }
      setStr(data as StrStatusResponse);
    } finally {
      setSaving(false);
    }
  }

  if (!str?.eligible) return null;
  const deadline = new Date(str.deadline!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  return (
    <section aria-labelledby={`str-${caseId}`} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`str-${caseId}`} className="text-base font-bold text-white">
          Báo cáo giao dịch đáng ngờ (bản nháp)
        </h3>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          {DEMO_SIMULATION_LABEL}
        </span>
      </div>
      {str.confirmedAt ? (
        <p role="status" className="text-sm font-semibold text-emerald-300">
          Đã xác nhận gửi lúc{" "}
          {new Date(str.confirmedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} bởi{" "}
          {CAST[str.confirmedBy as keyof typeof CAST]?.name ?? str.confirmedBy} (mô phỏng, không gửi thật).
        </p>
      ) : (
        <p
          role={str.overdue ? "alert" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            str.overdue ? "bg-amber-100 text-amber-900" : "bg-slate-800 text-slate-100"
          }`}
        >
          {str.overdue ? "ĐÃ QUÁ HẠN — " : "Hạn gửi: "}
          {deadline} · {str.basisVi}
        </p>
      )}
      <pre className="whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-sm text-slate-200">{str.draftVi}</pre>
      <p className="text-sm text-slate-300">
        Không nhắc tới báo cáo này với khách hàng hay trong thẻ CSKH (Luật PCRT Điều 40.2).
      </p>
      {!str.confirmedAt && (
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={saving}
          className="inline-flex min-h-[48px] items-center rounded-lg bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue disabled:opacity-60"
        >
          {saving ? "Đang ghi…" : "Tôi có thẩm quyền — xác nhận gửi (mô phỏng)"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
