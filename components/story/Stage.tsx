"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { DEMO_SIMULATION_LABEL } from "@/contracts";
import { Backstage, PhoneFrame } from "@/components/story/BeatViews";
import { SummaryCard } from "@/components/story/SummaryCard";
import { CAST } from "@/lib/cast";
import { newSessionSlug } from "@/lib/demo-session";
import { CHECKER_DRAFT_VI, MAKER_DRAFT_VI, runBeat, storyContext } from "@/lib/story/actions";
import {
  beatById,
  initialStoryState,
  isBeatLocked,
  STORY_BEATS,
  storyReducer,
  type Chapter,
} from "@/lib/story/machine";

const CHAPTERS: { n: Chapter; title: string; fullScreen: string }[] = [
  { n: 1, title: "Phát hiện", fullScreen: "/shield" },
  { n: 2, title: "Tạm giữ", fullScreen: "/family" },
  { n: 3, title: "Điều tra", fullScreen: "/warroom" },
  { n: 4, title: "Bảo vệ người khác", fullScreen: "/checker" },
];

/** The story stage: narration, phone ↔ "Phía sau màn hình", chapter rail, one primary button. */
export function Stage({ session }: { session: string }) {
  const [state, dispatch] = useReducer(storyReducer, undefined, initialStoryState);
  const inFlight = useRef(false); // reducer ignores a 2nd start only after re-render; this blocks same-tick double clicks
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Maker and Checker each write their own reason (prefilled draft, presenter adds words)
  const [makerRationale, setMakerRationale] = useState(MAKER_DRAFT_VI);
  const [checkerRationale, setCheckerRationale] = useState(CHECKER_DRAFT_VI);
  const [showSummary, setShowSummary] = useState(false);

  const current = state.current === "done" ? null : beatById(state.current);
  const narrating = beatById(state.shown);
  const onCurrent = current?.id === state.shown;
  const rationaleBeat = onCurrent && current?.needsRationale ? current.id : null;
  const rationaleText = rationaleBeat === "3.2" ? makerRationale : checkerRationale;
  const rationaleMissing = rationaleBeat !== null && rationaleText.trim().length < 3;
  const rationaleRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const firstRender = useRef(true);
  // one focus rule: a reason to write → the textarea; otherwise → the chapter heading
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false; // don't steal focus from the header nav on load
      return;
    }
    (rationaleRef.current ?? headingRef.current)?.focus();
  }, [state.shown]);
  useEffect(() => {
    if (showSummary) summaryRef.current?.querySelector<HTMLElement>("#summary-title")?.focus();
  }, [showSummary]);
  const nextLocked = STORY_BEATS.filter((b) => b.id.endsWith(".1")).find((b) => isBeatLocked(state, b.id));

  async function play() {
    if (!current || inFlight.current || rationaleMissing) return;
    inFlight.current = true;
    dispatch({ type: "beatStarted" });
    try {
      const result = await runBeat(current.id, {
        ...storyContext(state.results),
        session,
        makerRationale,
        checkerRationale,
      });
      dispatch({ type: "beatSucceeded", result });
    } catch (err) {
      dispatch({ type: "beatFailed", message: err instanceof Error ? err.message : "Không thể hoàn tất bước này." });
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-28 lg:pb-0">
      <div className="flex flex-col items-start gap-2 rounded-xl bg-momo-primary px-4 py-3 text-white lg:flex-row lg:items-center lg:gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-white focus:outline-none">
          Chương {state.viewing}/4 · {CHAPTERS[state.viewing - 1].title}
        </h2>
        <p className="flex-1 text-base">{narrating.narration}</p>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-base font-semibold text-amber-900">
          {DEMO_SIMULATION_LABEL}
        </span>
        <a
          className="tech-only text-base text-white underline"
          href={`${CHAPTERS[state.viewing - 1].fullScreen}?session=${encodeURIComponent(session)}`}
        >
          Mở màn hình đầy đủ
        </a>
      </div>

      <p className="text-base text-slate-700">
        Vai bạn đang đóng:{" "}
        <strong className="text-momo-primary">
          {CAST[narrating.actor].name} — {CAST[narrating.actor].role}
        </strong>
      </p>

      {showSummary ? (
        <div ref={summaryRef}>
          <SummaryCard state={state} />
        </div>
      ) : (
        <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
          <PhoneFrame state={state} />
          <span aria-hidden="true" className="hidden self-center text-3xl text-shift-blue lg:block">
            →
          </span>
          <Backstage state={state} />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 bg-white/95 py-3 lg:sticky lg:bottom-0 lg:flex-row lg:items-center">
        <nav aria-label="Các chương" className="flex-1">
          <ol className="flex flex-wrap gap-2">
            {CHAPTERS.map((c) => {
              const firstBeat = STORY_BEATS.find((b) => b.chapter === c.n)!;
              const locked = isBeatLocked(state, firstBeat.id);
              return (
                <li key={c.n}>
                  <button
                    type="button"
                    disabled={locked}
                    aria-current={state.viewing === c.n ? "step" : undefined}
                    onClick={() => dispatch({ type: "viewChapter", chapter: c.n })}
                    title={locked ? firstBeat.lockedReason : undefined}
                    className="min-h-[48px] rounded-lg border border-slate-300 px-3 text-base aria-[current=step]:border-shift-blue aria-[current=step]:bg-shift-blue aria-[current=step]:text-white disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
                  >
                    {c.n} · {c.title}
                    {locked && <span className="sr-only"> (chưa mở: {firstBeat.lockedReason})</span>}
                  </button>
                </li>
              );
            })}
          </ol>
          {nextLocked && (
            <p className="mt-2 text-base text-slate-600">
              Chương {nextLocked.chapter}: {nextLocked.lockedReason}
            </p>
          )}
        </nav>

        <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col items-stretch gap-1 border-t border-slate-200 bg-white px-4 py-2 lg:static lg:items-end lg:border-0 lg:p-0">
          {state.error && (
            <p role="alert" className="max-w-md text-base text-red-700">
              {state.error}{" "}
              <a href={`/story?session=${newSessionSlug()}`} className="font-semibold underline">
                Chạy lại từ đầu
              </a>
            </p>
          )}
          {rationaleBeat && (
            <div className="flex w-full flex-col gap-1 lg:w-[28rem]">
              <label htmlFor="story-rationale" className="text-base font-semibold text-slate-800">
                Lý do của {CAST[current!.actor].name} (bắt buộc)
              </label>
              <textarea
                id="story-rationale"
                ref={rationaleRef}
                required
                aria-invalid={rationaleMissing}
                rows={2}
                value={rationaleText}
                onChange={(e) =>
                  rationaleBeat === "3.2" ? setMakerRationale(e.target.value) : setCheckerRationale(e.target.value)
                }
                className="rounded-lg border border-slate-300 p-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue"
              />
            </div>
          )}
          {current && onCurrent ? (
            <button
              type="button"
              onClick={(e) => {
                if (e.detail > 1) return; // 2nd click of a double click on "Tiếp" lands here
                void play();
              }}
              aria-disabled={state.running || rationaleMissing}
              className="min-h-[52px] rounded-lg bg-momo-primary px-6 text-lg font-semibold text-white hover:bg-shift-blue aria-disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
            >
              {state.running
                ? "Đang chạy…"
                : state.error
                  ? `Thử lại: ${current.buttonLabel}`
                  : `${current.buttonLabel} →`}
            </button>
          ) : current ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "next" })}
              className="min-h-[52px] rounded-lg bg-momo-primary px-6 text-lg font-semibold text-white hover:bg-shift-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
            >
              {state.done.includes(state.shown) ? "Tiếp →" : "Về bước đang diễn ra →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSummary((v) => !v)}
              className="min-h-[52px] rounded-lg bg-momo-primary px-6 text-lg font-semibold text-white hover:bg-shift-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
            >
              {showSummary ? "← Xem lại chương 4" : "Xem tổng kết →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
