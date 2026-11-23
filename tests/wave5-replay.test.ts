import { afterAll, afterEach, describe, expect, it } from "vitest";
import { POST as postScan } from "@/app/api/shield/scan/route";
import { LLMTimeoutError, setLLMProviderForTest, type LLMProvider } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { redactText } from "@/lib/pii";
import { DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL } from "@/lib/session";
import {
  loadScanReplay,
  loadWarRoomReplay,
  parseScanReplayRecord,
  parseWarRoomReplayRecord,
  SCAN_REPLAY_RECORDS,
} from "@/lib/replay";
import { isReplayModel } from "@/lib/replay-label";
import { POST as postInvestigate } from "@/app/api/warroom/cases/[caseId]/investigate/route";
import { ensureSessionSeeded } from "@/lib/session";
import warroomCase01 from "@/data/replays/warroom-CASE-01.json";

/** Seam: replay loader — a stored real run is only ever shown with its replay label (ticket #11). */
const VALID = {
  kind: "scan",
  presetCode: "CASE-01",
  recordedAt: "2026-11-23T14:10:00.000Z",
  modelUsed: "gemini-3-flash-preview",
  measuredLatencyMs: 9792,
  result: SCAN_REPLAY_RECORDS["CASE-01"]?.result,
};

describe("scan replay loader", () => {
  it("always returns the replay label with time, model and 'phát lại'", () => {
    const replay = loadScanReplay("CASE-01");
    expect(replay).not.toBeNull();
    expect(replay!.noticeVi).toMatch(/^Kết quả đã chạy thật lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4} · model .+ · phát lại$/);
    expect(replay!.noticeVi).toContain(replay!.modelUsed);
  });

  it("returns null for presets that have no recorded real run", () => {
    expect(loadScanReplay("CASE-03")).toBeNull();
  });

  it("rejects records without a model or time, or recorded from a non-LLM path", () => {
    expect(() => parseScanReplayRecord({ ...VALID, modelUsed: "" })).toThrow();
    expect(() => parseScanReplayRecord({ ...VALID, recordedAt: "not-a-date" })).toThrow();
    for (const model of [DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL]) {
      expect(() => parseScanReplayRecord({ ...VALID, modelUsed: model })).toThrow();
    }
    expect(parseScanReplayRecord(VALID).modelUsed).toBe("gemini-3-flash-preview");
  });

  it("stored records contain no raw PII", () => {
    for (const record of Object.values(SCAN_REPLAY_RECORDS)) {
      const text = JSON.stringify(record);
      expect(redactText(text, { preserveAccounts: ["990123456789"] }).hits).toEqual([]);
    }
  });
});

describe("scan route uses the labelled replay only on runtime LLM failure", () => {
  const sessionId = `w5-replay-${Date.now()}`;
  const failingProvider = (): LLMProvider => {
    const fail = async () => {
      throw new LLMTimeoutError("LLM (gemini/mock) vượt quá giới hạn 20000ms.");
    };
    return {
      backend: "gemini",
      visionModel: "mock-vision",
      reasoningModel: "mock-reasoning",
      isConfigured: () => true,
      analyzeImage: fail as LLMProvider["analyzeImage"],
      generateJSON: fail as LLMProvider["generateJSON"],
    };
  };
  const scan = (presetCode: string) =>
    postScan(
      new Request(`http://localhost:3000/api/shield/scan?session=${sessionId}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-session-id": sessionId },
        body: JSON.stringify({ userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode }),
      }),
    );

  afterEach(() => setLLMProviderForTest(null));
  afterAll(async () => {
    await prisma.$transaction([
      prisma.scanSession.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.auditLog.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.userConsent.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.heldTransaction.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.investigationCase.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.immunityIndicator.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.appeal.deleteMany({ where: { demoSessionId: sessionId } }),
    ]);
  });

  it("shows the recorded real run with its replay label when the live call fails", async () => {
    setLLMProviderForTest(failingProvider());
    const res = await scan("CASE-01");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fallbackMode).toBe(true);
    expect(body.fallbackNoticeVi).toMatch(/· phát lại$/);
    expect(body.modelUsed).toBe(`${SCAN_REPLAY_RECORDS["CASE-01"]!.modelUsed} (phát lại)`);
    expect(body.sanitizedEvidence.contains_raw_image).toBe(false);
  });

  it("propagates the failure for presets without a recorded run (nothing invented)", async () => {
    setLLMProviderForTest(failingProvider());
    const res = await scan("CASE-03");
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

/** Seam: War-Room replay (ticket #15) — same rules as the scan replay. */
describe("war-room replay loader", () => {
  it("returns the recorded real run with time, model and 'phát lại'", () => {
    const replay = loadWarRoomReplay("CASE-01");
    expect(replay).not.toBeNull();
    expect(replay!.noticeVi).toMatch(/^Kết quả đã chạy thật lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4} · model .+ · phát lại$/);
    expect(isReplayModel(replay!.debate.model_used)).toBe(true);
    expect(isReplayModel("Qwen3.8-27B")).toBe(false);
  });

  it("returns null for scenarios without a recorded run", () => {
    expect(loadWarRoomReplay("CASE-03")).toBeNull();
  });

  it("rejects records without a model or time, or from a non-LLM path", () => {
    expect(() => parseWarRoomReplayRecord({ ...warroomCase01, modelUsed: "" })).toThrow();
    expect(() => parseWarRoomReplayRecord({ ...warroomCase01, recordedAt: "nope" })).toThrow();
    for (const model of [DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL]) {
      expect(() => parseWarRoomReplayRecord({ ...warroomCase01, modelUsed: model })).toThrow();
    }
  });

  it("stored record contains no raw PII", () => {
    const text = JSON.stringify(warroomCase01);
    expect(redactText(text, { preserveAccounts: ["990123456789"] }).hits).toEqual([]);
  });
});

describe("investigate route uses the labelled replay only when the live run fails", () => {
  const sessionId = `w5-wr-replay-${Date.now()}`;
  const failing = (configured = true): LLMProvider => {
    const fail = async () => {
      throw new LLMTimeoutError("LLM (mock) vượt quá giới hạn.");
    };
    return {
      backend: "gemini",
      visionModel: "mock-vision",
      reasoningModel: "mock-reasoning",
      isConfigured: () => configured,
      analyzeImage: fail as LLMProvider["analyzeImage"],
      generateJSON: fail as LLMProvider["generateJSON"],
    };
  };
  const investigate = (scenario: string, stream = false) => {
    const caseId = `${sessionId}::${scenario}`;
    return postInvestigate(
      new Request(
        `http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?session=${sessionId}${stream ? "&stream=1" : ""}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      ),
      { params: Promise.resolve({ caseId }) },
    );
  };

  afterEach(() => setLLMProviderForTest(null));
  afterAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.userConsent.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.heldTransaction.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.investigationCase.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.immunityIndicator.deleteMany({ where: { demoSessionId: sessionId } }),
    ]);
  });

  it("returns and persists the replay when every live agent fails (JSON)", async () => {
    await ensureSessionSeeded(sessionId);
    setLLMProviderForTest(failing());
    const res = await investigate("CASE-01");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(isReplayModel(body.debate.model_used)).toBe(true);
    const row = await prisma.investigationCase.findFirst({ where: { caseId: `${sessionId}::CASE-01` } });
    expect(row?.status).toBe("PENDING_DECISION");
    expect(JSON.parse(row!.agentDebateJson!).model_used).toBe(body.debate.model_used);
  });

  it("streams the replay as the completed event (SSE)", async () => {
    setLLMProviderForTest(failing());
    const res = await investigate("CASE-01", true);
    const text = await res.text();
    const events = text.split("\n\n").filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, "")));
    const last = events[events.length - 1];
    expect(last.event).toBe("completed");
    expect(isReplayModel(last.debate.model_used)).toBe(true);
  });

  it("keeps 503 LLM_NOT_CONFIGURED when credentials are missing", async () => {
    setLLMProviderForTest(failing(false));
    const res = await investigate("CASE-01");
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("LLM_NOT_CONFIGURED");
  });

  it("invents nothing for scenarios without a recorded run", async () => {
    setLLMProviderForTest(failing());
    const res = await investigate("CASE-03");
    const body = await res.json();
    expect(res.status === 200 ? isReplayModel(body.debate.model_used) : false).toBe(false);
  });
});
