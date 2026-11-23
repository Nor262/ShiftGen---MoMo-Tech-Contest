import { afterAll, afterEach, describe, expect, it } from "vitest";
import { POST as postScan } from "@/app/api/shield/scan/route";
import { LLMTimeoutError, setLLMProviderForTest, type LLMProvider } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { redactText } from "@/lib/pii";
import { DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL } from "@/lib/session";
import { loadScanReplay, parseScanReplayRecord, SCAN_REPLAY_RECORDS } from "@/lib/replay";

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
    expect(body.modelUsed).toBe(SCAN_REPLAY_RECORDS["CASE-01"]!.modelUsed);
    expect(body.sanitizedEvidence.contains_raw_image).toBe(false);
  });

  it("propagates the failure for presets without a recorded run (nothing invented)", async () => {
    setLLMProviderForTest(failingProvider());
    const res = await scan("CASE-03");
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
