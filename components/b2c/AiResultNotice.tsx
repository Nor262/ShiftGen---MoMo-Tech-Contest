"use client";

import { useState } from "react";
import type { PersonaId, ShieldScanResponse } from "@/contracts";
import { isRegistryOnlyModel } from "@/lib/cast";
import { parseApiErrorMessage } from "./labels";

/**
 * #5: every scan result says where it came from (Luật 134/2025 Điều 11.1) and offers a human
 * review (Điều 4.2). A pure immunity-registry match is labelled as such, never as AI.
 */
export function AiResultNotice({ scan, userId }: { scan: ShieldScanResponse; userId: PersonaId }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const fromRegistry = isRegistryOnlyModel(scan.modelUsed);

  async function requestReview() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch(`/api/shield/scan/${encodeURIComponent(scan.scanId)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        setError(parseApiErrorMessage(res.status, await res.json().catch(() => null)));
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Không thể gửi yêu cầu lúc này. Vui lòng thử lại.");
      setState("idle");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="flex-1 text-sm font-semibold text-slate-800">
        {fromRegistry
          ? "Kết quả tra cứu Kho Miễn dịch do con người duyệt (không dùng AI)"
          : "Kết quả do AI tạo — có thể sai, hãy kiểm tra lại trước khi quyết định"}
      </p>
      {state === "sent" ? (
        <p role="status" className="text-sm font-semibold text-emerald-800">
          Đã gửi. Một chuyên viên sẽ xem xét lại kết quả này.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void requestReview()}
          disabled={state === "sending"}
          className="inline-flex min-h-[48px] items-center rounded-lg border border-momo-primary px-4 text-sm font-semibold text-momo-primary hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {state === "sending" ? "Đang gửi…" : "Nhờ người thật xem xét"}
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
