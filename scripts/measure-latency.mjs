// Measures real latency of the two AI flows on a deployed TrustLoop (ticket #4).
// Usage: node scripts/measure-latency.mjs [baseUrl] [runs]
//   default baseUrl https://momo-trustloop.vercel.app, runs 10. Each run uses its own fresh ?session=.
// Prints JSON (raw samples + summary). Replays ("(phát lại") and failures are excluded from the numbers.
import { summarize } from "./latency-stats.mjs";

const base = process.argv[2] ?? "https://momo-trustloop.vercel.app";
const runs = Number(process.argv[3] ?? 10);
const stamp = Date.now().toString(36);

async function post(path, session, body) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}session=${session}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, wallMs: Math.round(performance.now() - t0), json };
}

const scan = [];
const warroom = [];
for (let i = 1; i <= runs; i++) {
  const session = `measure-${stamp}-${i}`;
  const s = await post("/api/shield/scan", session, { userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" });
  scan.push({
    ok: s.ok && !s.json.fallbackMode,
    ms: s.json.measuredLatencyMs ?? 0,
    wallMs: s.wallMs,
    model: s.json.modelUsed ?? "",
    risk: s.json.result?.risk_level,
    at: new Date().toISOString(),
  });
  const caseId = encodeURIComponent(`${session}::CASE-01`);
  const w = await post(`/api/warroom/cases/${caseId}/investigate`, session, {});
  const agents = Object.values(w.json.debate?.agents ?? {});
  warroom.push({
    ok: w.ok && agents.length === 4 && agents.every((a) => a.status === "OK"),
    ms: Math.round(w.json.debate?.total_latency_ms ?? 0),
    wallMs: w.wallMs,
    model: w.json.debate?.model_used ?? "",
    at: new Date().toISOString(),
  });
  process.stderr.write(`run ${i}: scan ${scan.at(-1).ms}ms · war-room ${warroom.at(-1).ms}ms\n`);
}

console.log(JSON.stringify({ base, runs, scan, warroom, summary: { scan: summarize(scan), warroom: summarize(warroom) } }, null, 2));
