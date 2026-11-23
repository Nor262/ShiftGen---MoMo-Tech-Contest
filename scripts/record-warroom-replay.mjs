// Records a REAL War-Room run (4 agents + synthesis) as a replay file (ticket #15).
// Usage (dev server running with a working LLM): node scripts/record-warroom-replay.mjs CASE-01
import fs from "node:fs";

const scenario = process.argv[2];
if (!/^CASE-0[123]$/.test(scenario ?? "")) throw new Error("Usage: node scripts/record-warroom-replay.mjs CASE-01|CASE-02|CASE-03");

const base = process.env.REPLAY_BASE_URL ?? "http://localhost:3000";
const session = `replay-recorder-${Date.now()}`;
const caseId = `${session}::${scenario}`;
const res = await fetch(`${base}/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?session=${session}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
const body = await res.json();
if (!res.ok) throw new Error(`Investigation failed: ${res.status} ${body.code ?? ""}`);
const { debate } = body;
if (debate.model_used.includes("(phát lại")) throw new Error("Refusing to record: response is itself a replay");
const degraded = Object.entries(debate.agents).filter(([, a]) => a.status !== "OK").map(([k]) => k);
if (degraded.length) throw new Error(`Refusing to record: agents not OK: ${degraded.join(", ")}`);

const record = { kind: "warroom", scenarioCode: scenario, recordedAt: new Date().toISOString(), modelUsed: debate.model_used, debate };
fs.writeFileSync(`data/replays/warroom-${scenario}.json`, JSON.stringify(record, null, 2) + "\n");
console.log(`Recorded ${scenario}: ${record.modelUsed}, ${Math.round(debate.total_latency_ms)}ms`);
