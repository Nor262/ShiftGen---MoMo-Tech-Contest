"use client";

import { useId } from "react";
import type { HeldTxStatus, ShieldScanResponse } from "@/contracts";
import { buildEvidencePack, POLICE_GUIDE } from "@/lib/police-report";

/**
 * Ticket #8: where and how to report, plus a PII-redacted evidence pack generated on the device.
 * Shown after a high-risk scan, after a cancelled transfer, and at the end of /story.
 */
export function PoliceReportGuide({
  scan,
  txStatus,
}: {
  scan: Pick<ShieldScanResponse, "result" | "modelUsed"> | null;
  txStatus?: HeldTxStatus;
}) {
  const titleId = useId();

  function download() {
    if (!scan) return;
    const pack = buildEvidencePack({
      result: scan.result,
      modelUsed: scan.modelUsed,
      scannedAt: new Date().toISOString(),
      txStatus,
    });
    const url = URL.createObjectURL(new Blob([pack], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "goi-bang-chung-trustloop.txt";
    document.body.appendChild(a); // older Firefox needs it in the DOM
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking at once can cancel the download in Safari
  }

  return (
    <section aria-labelledby={titleId} className="space-y-3 rounded-2xl border border-slate-300 bg-white p-5">
      <h3 id={titleId} className="text-xl font-semibold text-momo-primary">
        {POLICE_GUIDE.title}
      </h3>
      <ol className="list-decimal space-y-2 pl-6 text-lg text-slate-800">
        {POLICE_GUIDE.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <ul className="list-disc space-y-1 pl-6 text-lg text-slate-700">
        {POLICE_GUIDE.rights.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-lg text-amber-900">{POLICE_GUIDE.secondScamWarning}</p>
      {scan && (
        <button
          type="button"
          onClick={download}
          className="inline-flex min-h-[48px] items-center rounded-lg bg-momo-primary px-5 text-lg font-semibold text-white hover:bg-shift-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
        >
          Tải gói bằng chứng (đã ẩn thông tin cá nhân)
        </button>
      )}
    </section>
  );
}
