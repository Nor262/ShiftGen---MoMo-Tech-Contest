"use client";

import Link from "next/link";
import { DEMO_SIMULATION_LABEL, type InvestigateCaseResponse, type ShieldScanResponse } from "@/contracts";
import { CAST } from "@/lib/cast";
import { newSessionSlug } from "@/lib/demo-session";
import { isReplayModel, isReplayNotice } from "@/lib/replay-label";
import { STORY_AMOUNT_VND } from "@/lib/story/actions";
import type { StoryState } from "@/lib/story/machine";

const duration = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây`;

/** End of the story: what was kept, and how long each AI step actually took in this run. */
export function SummaryCard({ state }: { state: StoryState }) {
  const scan = state.results["1.2"] as ShieldScanResponse | undefined;
  const warroom = state.results["3.1"] as InvestigateCaseResponse | undefined;
  const probe = state.results["4.2"] as ShieldScanResponse | undefined;
  const timings = [
    scan && {
      step: "Đọc tin nhắn (Phút 00)",
      ms: scan.measuredLatencyMs,
      replay: Boolean(scan.fallbackNoticeVi && isReplayNotice(scan.fallbackNoticeVi)),
    },
    warroom && {
      step: "War-Room 4 agent",
      ms: warroom.debate.total_latency_ms,
      replay: isReplayModel(warroom.debate.model_used),
    },
    probe && { step: "Cảnh báo người dùng mới", ms: probe.measuredLatencyMs, replay: false },
  ].filter(Boolean) as { step: string; ms: number; replay: boolean }[];

  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="summary-title" className="text-xl font-semibold text-momo-primary">
          {STORY_AMOUNT_VND.toLocaleString("vi-VN")}đ vẫn ở trong ví {CAST.USER_B2C_HUNG.name}
        </h3>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-base font-semibold text-amber-900">
          {DEMO_SIMULATION_LABEL}
        </span>
      </div>
      <p className="mt-2 text-base text-slate-700">
        Và người dùng tiếp theo được cảnh báo trước khi chuyển tiền cho cùng tài khoản đó.
      </p>
      {timings.length > 0 && (
        <p className="mt-3 text-base font-semibold text-slate-700">Thời gian đo được</p>
      )}
      {timings.length > 0 && (
        <dl className="mt-2 grid gap-2 sm:grid-cols-3">
          {timings.map((t) => (
            <div key={t.step} className="rounded-lg bg-white p-3">
              <dt className="text-base text-slate-600">{t.step}</dt>
              <dd className="font-mono text-lg text-emerald-800">{duration(t.ms)}</dd>
              {t.replay && <dd className="text-base text-slate-600">phát lại bản ghi, không phải AI chạy lần này</dd>}
            </div>
          ))}
        </dl>
      )}
      <Link
        href={`/story?session=${newSessionSlug()}`}
        className="mt-4 inline-flex min-h-[48px] items-center rounded-lg border border-momo-primary px-4 text-base font-semibold text-momo-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
      >
        Chạy lại từ đầu
      </Link>
    </section>
  );
}
