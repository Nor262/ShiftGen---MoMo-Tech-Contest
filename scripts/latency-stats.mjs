// Shared by scripts/measure-latency.mjs and tests/latency-stats.test.ts (ticket #4).

const isReplay = (model) => typeof model === "string" && model.includes("(phát lại");

/**
 * @param {{ ms: number, model: string, ok: boolean }[]} samples
 * Only successful live runs count; replays and failures are reported, never averaged in.
 */
export function summarize(input) {
  // a run without a server timing is a failed measurement, never 0 ms
  const samples = input.map((s) => (Number.isFinite(s.ms) ? s : { ...s, ok: false }));
  const failed = samples.filter((s) => !s.ok).length;
  const excludedReplays = samples.filter((s) => s.ok && isReplay(s.model)).length;
  const live = samples.filter((s) => s.ok && !isReplay(s.model));
  const sorted = live.map((s) => s.ms).sort((a, b) => a - b);
  const n = sorted.length;
  const median = n === 0 ? null : n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    runs: n,
    min: n ? sorted[0] : null,
    median,
    max: n ? sorted[n - 1] : null,
    models: [...new Set(live.map((s) => s.model))],
    excludedReplays,
    failed,
  };
}
