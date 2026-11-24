// Records a REAL War-Room run (4 agents + synthesis) as a replay file (tickets #15, #36).
// Usage: node scripts/record-warroom-replay.mjs [baseUrl]   (default http://localhost:3000)
// Runs the same flow as /story so the case carries real Phút 00 evidence before it is investigated:
// 24h protection + guardian invite → guardian accepts → scan consent → scan CASE-01 → transfer → escalate.
import fs from "node:fs";

const base = process.argv[2] ?? process.env.REPLAY_BASE_URL ?? "http://localhost:3000";
const session = `replay-recorder-${Date.now().toString(36)}`;

async function post(path, body) {
  const res = await fetch(`${base}${path}?session=${session}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${res.status} ${json.code ?? ""} ${json.error ?? ""}`);
  return json;
}

await post("/api/shield/consent", { userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" });
await post("/api/shield/family/guardian", { action: "ACCEPT", ownerId: "USER_B2C_HUNG", guardianId: "FAMILY_MINH" });
await post("/api/shield/consent", { userId: "USER_B2C_HUNG", optInScan: true });
const scan = await post("/api/shield/scan", { userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" });
if (scan.fallbackMode) throw new Error("Refusing to record: the scan itself was a replay/fallback");
const tx = await post("/api/shield/transfer", {
  userId: "USER_B2C_HUNG",
  scanId: scan.scanId,
  recipientAccount: "990123456789",
  recipientBank: "Ngân hàng nhận (MẪU MÔ PHỎNG)",
  amountVnd: 9_500_000,
});
if (tx.status !== "ON_HOLD_24H") throw new Error(`Refusing to record: transfer was ${tx.status}, not held`);
const esc = await post(`/api/shield/family/escalate/${encodeURIComponent(tx.txId)}`, { guardianId: "FAMILY_MINH" });
const inv = await post(`/api/warroom/cases/${encodeURIComponent(esc.caseId)}/investigate`, {});

const { debate } = inv;
if (debate.model_used.includes("(phát lại")) throw new Error("Refusing to record: response is itself a replay");
const degraded = Object.entries(debate.agents).filter(([, a]) => a.status !== "OK").map(([k]) => k);
if (degraded.length) throw new Error(`Refusing to record: agents not OK: ${degraded.join(", ")}`);

const record = { kind: "warroom", scenarioCode: "CASE-01", recordedAt: new Date().toISOString(), modelUsed: debate.model_used, debate };
fs.writeFileSync("data/replays/warroom-CASE-01.json", JSON.stringify(record, null, 2) + "\n");
console.log(
  `Recorded CASE-01 from ${base}: ${record.modelUsed}, ${Math.round(debate.total_latency_ms)}ms, minute0_matched=${debate.agents.evidence_correlator.minute0_matched}`,
);
