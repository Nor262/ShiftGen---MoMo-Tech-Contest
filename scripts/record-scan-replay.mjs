// Records a REAL LLM scan of a demo preset as a replay file (ticket #11).
// Usage (dev server running with a working LLM): node scripts/record-scan-replay.mjs CASE-01
import fs from "node:fs";

const preset = process.argv[2];
if (!/^CASE-0[123]$/.test(preset ?? "")) throw new Error("Usage: node scripts/record-scan-replay.mjs CASE-01|CASE-02|CASE-03");

const base = process.env.REPLAY_BASE_URL ?? "http://localhost:3000";
const res = await fetch(`${base}/api/shield/scan?session=replay-recorder`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: preset }),
});
const body = await res.json();
if (!res.ok) throw new Error(`Scan failed: ${res.status} ${body.code ?? ""}`);
if (body.fallbackMode) throw new Error("Refusing to record: response did not come from a live LLM run");

const record = {
  kind: "scan",
  presetCode: preset,
  recordedAt: new Date().toISOString(),
  modelUsed: body.modelUsed,
  measuredLatencyMs: body.measuredLatencyMs,
  result: body.result, // already PII-redacted by the scan route; piiDiff is deliberately not stored
};
fs.writeFileSync(`data/replays/scan-${preset}.json`, JSON.stringify(record, null, 2) + "\n");
console.log(`Recorded ${preset}: ${record.modelUsed}, ${record.measuredLatencyMs}ms`);
