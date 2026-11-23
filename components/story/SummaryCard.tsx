"use client";

import Link from "next/link";
import { DEMO_SIMULATION_LABEL, type InvestigateCaseResponse, type ShieldScanResponse } from "@/contracts";
import { CAST } from "@/lib/cast";
import { newSessionSlug } from "@/lib/demo-session";
import { isReplayModel, isReplayNotice } from "@/lib/replay-label";
import { duration, vnd } from "@/lib/story/format";
import { PoliceReportGuide } from "@/components/b2c/PoliceReportGuide";
import { STORY_AMOUNT_VND } from "@/lib/story/actions";
import type { StoryState } from "@/lib/story/machine";

/** End of the story: what was kept, and how long each AI step actually took in this run. */
export function SummaryCard({ state }: { state: StoryState }) {
  const scan = state.results["1.2"] as ShieldScanResponse | undefined;
  const warroom = state.results["3.1"] as InvestigateCaseResponse | undefined;
  const probe = state.results["4.2"] as ShieldScanResponse | undefined;
  const kept = (state.results["4.1"] as { txStatus?: string } | undefined)?.txStatus === "CANCELLED_BY_B2E";
  const isReplayScan = (s: ShieldScanResponse) => Boolean(s.fallbackNoticeVi && isReplayNotice(s.fallbackNoticeVi));
  const timings = [
    scan && {
      step: "Đọc tin nhắn (Phút 00)",
      ms: scan.measuredLatencyMs,
      replay: isReplayScan(scan),
    },
    warroom && {
      step: "War-Room 4 agent",
      ms: warroom.debate.total_latency_ms,
      replay: isReplayModel(warroom.debate.model_used),
    },
    probe && { step: "Cảnh báo người dùng mới", ms: probe.measuredLatencyMs, replay: isReplayScan(probe) },
  ].filter(Boolean) as { step: string; ms: number; replay: boolean }[];
  const measured = timings.filter((t) => !t.replay);
  const replayed = timings.filter((t) => t.replay);

  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="summary-title" tabIndex={-1} className="text-xl font-semibold text-momo-primary focus:outline-none">
          {kept
            ? `${vnd(STORY_AMOUNT_VND)} vẫn ở trong ví ${CAST.USER_B2C_HUNG.name}`
            : `Lệnh ${vnd(STORY_AMOUNT_VND)} của ${CAST.USER_B2C_HUNG.name} đã được tạm giữ`}
        </h3>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-base font-semibold text-amber-900">
          {DEMO_SIMULATION_LABEL}
        </span>
      </div>
      <p className="mt-2 text-base text-slate-700">
        Và người dùng tiếp theo được cảnh báo trước khi chuyển tiền cho cùng tài khoản đó.
      </p>
      <TimingList title="Thời gian đo trong lần chạy này" rows={measured} />
      <TimingList title="Phát lại bản ghi thật (không đo lần này)" rows={replayed} />
      {kept && (
        <details className="mt-4">
          <summary className="cursor-pointer text-base font-semibold text-shift-blue">
            {CAST.USER_B2C_HUNG.name} muốn trình báo công an?
          </summary>
          <div className="mt-3">
            <PoliceReportGuide scan={scan ?? null} txStatus="CANCELLED_BY_B2E" />
          </div>
        </details>
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

function TimingList({ title, rows }: { title: string; rows: { step: string; ms: number }[] }) {
  if (rows.length === 0) return null;
  return (
    <>
      <p className="mt-3 text-base font-semibold text-slate-700">{title}</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-3">
        {rows.map((t) => (
          <div key={t.step} className="rounded-lg bg-white p-3">
            <dt className="text-base text-slate-600">{t.step}</dt>
            <dd className="font-mono text-lg text-emerald-800">{duration(t.ms)}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
