import { describe, expect, it } from "vitest";
import { summarize } from "../scripts/latency-stats.mjs";

/** Seam: how measured runs become the min/median/max on Slide 9 (ticket #4). */
describe("summarize", () => {
  const live = (ms: number) => ({ ms, model: "gemma-4-31B-it", ok: true });

  it("reports min / median / max of live runs only", () => {
    const s = summarize([live(4000), live(3000), live(5000), live(3500)]);
    expect(s).toMatchObject({ runs: 4, min: 3000, median: 3750, max: 5000, models: ["gemma-4-31B-it"] });
  });

  it("drops replays and failed runs, and says how many were dropped", () => {
    const s = summarize([
      live(4000),
      { ms: 7000, model: "Qwen3.8-27B (phát lại · chạy thật 23:07 23/11/2026)", ok: true },
      { ms: 0, model: "", ok: false },
    ]);
    expect(s.runs).toBe(1);
    expect(s.excludedReplays).toBe(1);
    expect(s.failed).toBe(1);
  });

  it("returns nulls instead of inventing numbers when nothing was measured", () => {
    expect(summarize([])).toMatchObject({ runs: 0, min: null, median: null, max: null });
  });
});
