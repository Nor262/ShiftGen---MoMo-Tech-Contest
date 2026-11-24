"use client";

import { useState } from "react";
import type { PersonaId } from "@/contracts";
import { parseApiErrorMessage } from "./labels";

/**
 * #5: consent for the scan purpose, separate from Bảo vệ 24h (Luật 91/2025 Điều 9 — consent per
 * purpose, silence is not consent). Default off; the user can withdraw at any time.
 */
export function ScanConsentCard({
  userId,
  agreed,
  highlight,
  onChanged,
}: {
  userId: PersonaId;
  agreed: boolean;
  /** the last scan was refused for lack of consent: draw attention here */
  highlight: boolean;
  onChanged: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/shield/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, optInScan: next, consentVersion: "v1.0-law91-2025" }),
      });
      if (!res.ok) {
        setError(parseApiErrorMessage(res.status, await res.json().catch(() => null)));
        return;
      }
      await onChanged();
    } catch {
      setError("Không thể kết nối máy chủ để lưu lựa chọn.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="scan-consent"
      aria-labelledby="scan-consent-heading"
      className={`space-y-3 rounded-2xl border bg-white p-5 shadow-sm ${
        highlight ? "border-shift-blue ring-2 ring-shift-blue" : "border-slate-200"
      }`}
    >
      <h2 id="scan-consent-heading" className="text-lg font-semibold text-slate-900">
        Đồng ý cho AI phân tích khi quét
      </h2>
      <p className="text-sm text-slate-700">
        Khi bạn bấm Quét, ảnh hoặc nội dung được gửi tới AI để tìm dấu hiệu lừa đảo, rồi bị xóa sau phiên. Đây là
        lựa chọn riêng, không liên quan tới Bảo vệ 24h. Bạn rút lại được bất kỳ lúc nào.
      </p>
      {highlight && !agreed && (
        <p role="alert" className="text-sm font-semibold text-slate-900">
          Bạn cần đồng ý ở đây trước khi quét.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-sm font-semibold ${agreed ? "text-emerald-800" : "text-slate-600"}`}>
          {agreed ? "Đang đồng ý" : "Chưa đồng ý"}
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(!agreed)}
          className={`inline-flex min-h-[48px] items-center rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2 disabled:opacity-60 ${
            agreed
              ? "border border-slate-300 text-slate-800 hover:bg-slate-100"
              : "bg-momo-primary text-white hover:bg-shift-blue"
          }`}
        >
          {saving ? "Đang lưu…" : agreed ? "Rút lại đồng ý" : "Tôi đồng ý cho AI phân tích khi quét"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
