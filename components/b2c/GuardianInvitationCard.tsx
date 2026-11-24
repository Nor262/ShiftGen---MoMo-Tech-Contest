"use client";

import { useState } from "react";
import { CAST, castName } from "@/lib/cast";
import { GUARDIAN_SCOPE } from "@/lib/guardian-scope";
import { parseApiErrorMessage } from "./labels";

/**
 * #6: before a guardian sees any card they read what they will (and will never) see, then accept.
 * After the owner revokes, they see only a short notice.
 */
export function GuardianInvitationCard({
  invitedBy,
  revoked,
  onAccepted,
}: {
  invitedBy: string[];
  revoked: boolean;
  onAccepted: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownerId = invitedBy[0];

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/shield/family/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT", ownerId, guardianId: "FAMILY_MINH" }),
      });
      if (!res.ok) {
        setError(parseApiErrorMessage(res.status, await res.json().catch(() => null)));
        return;
      }
      await onAccepted();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  if (revoked && !ownerId) {
    return (
      <section aria-labelledby="guardian-revoked" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 id="guardian-revoked" className="text-lg font-bold text-slate-900">
          Quyền người giám hộ đã được thu hồi
        </h2>
        <p className="mt-2 text-base text-slate-700">Chủ ví đã thu hồi quyền này, nên bạn không thấy thẻ nào nữa.</p>
      </section>
    );
  }
  if (!ownerId) {
    return (
      <section aria-labelledby="guardian-none" className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 id="guardian-none" className="text-lg font-bold text-slate-900">
          Chưa có lời mời làm người giám hộ
        </h2>
        <p className="mt-2 text-base text-slate-700">
          Khi người thân bật Bảo vệ 24h và mời {CAST.FAMILY_MINH.name}, lời mời sẽ hiện ở đây.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="guardian-invite" className="space-y-3 rounded-2xl border border-shift-blue bg-white p-6">
      <h2 id="guardian-invite" className="text-lg font-bold text-slate-900">
        {castName(ownerId)} mời bạn làm người giám hộ
      </h2>
      <p className="text-base font-semibold text-slate-800">Bạn sẽ thấy:</p>
      <ul className="list-disc space-y-1 pl-6 text-base text-slate-700">
        {GUARDIAN_SCOPE.sees.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p className="text-base font-semibold text-slate-800">Bạn không bao giờ thấy:</p>
      <ul className="list-disc space-y-1 pl-6 text-base text-slate-700">
        {GUARDIAN_SCOPE.neverSees.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p className="text-base text-slate-700">{GUARDIAN_SCOPE.canDo}</p>
      <p className="text-base text-slate-700">{GUARDIAN_SCOPE.revocable}</p>
      <button
        type="button"
        onClick={() => void accept()}
        disabled={saving}
        className="inline-flex min-h-[48px] items-center rounded-lg bg-momo-primary px-5 text-base font-semibold text-white hover:bg-shift-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {saving ? "Đang lưu…" : "Tôi đồng ý làm người giám hộ"}
      </button>
      {error && (
        <p role="alert" className="text-base text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
