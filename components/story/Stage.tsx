"use client";

import { useEffect, useReducer, useRef } from "react";
import { DEMO_SIMULATION_LABEL } from "@/contracts";
import { Backstage, PhoneFrame } from "@/components/story/BeatViews";
import { CAST } from "@/lib/cast";
import { runBeat, storyContext } from "@/lib/story/actions";
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

  const current = state.current === "done" ? null : beatById(state.current);
  const narrating = beatById(state.shown);
  const onCurrent = current?.id === state.shown;

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false; // don't steal focus from the header nav on load
      return;
    }
    headingRef.current?.focus();
  }, [state.viewing]);
  const nextLocked = STORY_BEATS.filter((b) => b.id.endsWith(".1")).find((b) => isBeatLocked(state, b.id));

  async function play() {
    if (!current || inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "beatStarted" });
    try {
      const result = await runBeat(current.id, storyContext(state.results));
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

      <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
        <PhoneFrame state={state} />
        <span aria-hidden="true" className="hidden self-center text-3xl text-shift-blue lg:block">
          →
        </span>
        <Backstage state={state} />
      </div>

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
              {state.error}
            </p>
          )}
          {current && onCurrent ? (
            <button
              type="button"
              onClick={play}
              aria-disabled={state.running}
              className="min-h-[52px] rounded-lg bg-momo-primary px-6 text-lg font-semibold text-white hover:bg-shift-blue aria-disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shift-blue focus-visible:ring-offset-2"
            >
              {state.running ? "Đang chạy…" : state.error ? `Thử lại: ${current.buttonLabel}` : `${current.buttonLabel} →`}
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
            <p className="text-lg font-semibold text-emerald-800">Câu chuyện đã xong.</p>
          )}
        </div>
      </div>
    </div>
  );
}
