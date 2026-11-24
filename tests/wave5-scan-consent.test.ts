import { afterAll, afterEach, describe, expect, it } from "vitest";
import { POST as postConsent } from "@/app/api/shield/consent/route";
import { POST as postScan } from "@/app/api/shield/scan/route";
import { POST as postReview } from "@/app/api/shield/scan/[scanId]/review/route";
import { LLMTimeoutError, setLLMProviderForTest, type LLMProvider } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

/**
 * Seam: scan consent is its own purpose (ticket #5, Luật 91/2025 Điều 9; Luật 134/2025 Điều 4.2, 11.1).
 * The AI provider fails on purpose so CASE-01 answers with its labelled replay — no real AI call here.
 */
const sessionId = `w5-consent-${Date.now()}`;
const failing: LLMProvider = {
  backend: "gemini",
  visionModel: "m",
  reasoningModel: "m",
  isConfigured: () => true,
  analyzeImage: (async () => {
    throw new LLMTimeoutError("timeout");
  }) as LLMProvider["analyzeImage"],
  generateJSON: (async () => {
    throw new LLMTimeoutError("timeout");
  }) as LLMProvider["generateJSON"],
};

const json = (path: string, body: unknown) =>
  new Request(`http://localhost${path}?session=${sessionId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const consent = (body: Record<string, unknown>) => postConsent(json("/api/shield/consent", { userId: "USER_B2C_HUNG", ...body }));
const scan = () => postScan(json("/api/shield/scan", { userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" }));

afterEach(() => setLLMProviderForTest(null));
afterAll(async () => {
  await prisma.$transaction([
    prisma.scanSession.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.auditLog.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.userConsent.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.heldTransaction.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.investigationCase.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.immunityIndicator.deleteMany({ where: { demoSessionId: sessionId } }),
  ]);
});

describe("scan consent is required, separate and withdrawable", () => {
  it("refuses to scan before the user agrees (silence is not consent)", async () => {
    setLLMProviderForTest(failing);
    const res = await scan();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("SCAN_CONSENT_REQUIRED");
  });

  it("scans once the user agrees to the scan purpose", async () => {
    setLLMProviderForTest(failing);
    const c = await consent({ optInScan: true });
    expect(c.status).toBe(200);
    expect((await c.json()).consent.optInScan).toBe(true);
    const res = await scan();
    expect(res.status).toBe(200);
  });

  it("keeps the two purposes independent", async () => {
    const hold = await consent({ optIn24hHold: true, guardianId: "FAMILY_MINH" });
    const body = (await hold.json()).consent;
    expect(body.optIn24hHold).toBe(true);
    expect(body.optInScan).toBe(true); // turning on 24h protection did not touch scan consent
  });

  it("refuses again after the user withdraws scan consent", async () => {
    setLLMProviderForTest(failing);
    const off = await consent({ optInScan: false });
    expect((await off.json()).consent).toMatchObject({ optInScan: false, optIn24hHold: true });
    const res = await scan();
    expect(res.status).toBe(403);
  });

  it("logs every grant and withdrawal with the purpose and time", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { demoSessionId: sessionId, action: "CONSENT_UPDATED" },
      orderBy: { createdAt: "asc" },
    });
    const scanChanges = logs.map((l) => JSON.parse(l.metadataJson ?? "{}")).filter((m) => "optInScan" in m);
    expect(scanChanges.map((m) => m.optInScan)).toEqual([true, false]);
    expect(logs.every((l) => l.createdAt instanceof Date)).toBe(true);
  });

  it("refuses an image/preset scan before touching the image when consent is missing", async () => {
    await consent({ optInScan: false });
    setLLMProviderForTest(failing);
    const res = await postScan(
      json("/api/shield/scan", { userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" }),
    );
    expect(res.status).toBe(403);
    // nothing was analysed or stored for this refused request
    const scans = await prisma.scanSession.count({ where: { demoSessionId: sessionId } });
    expect(scans).toBe(1); // only the one consented scan from earlier
  });

  it("rejects a consent request that changes nothing", async () => {
    const res = await consent({});
    expect(res.status).toBe(400);
  });
});

describe("'Nhờ người thật xem xét' on a scan result", () => {
  it("records a human-review request for the user's own scan", async () => {
    setLLMProviderForTest(failing);
    await consent({ optInScan: true });
    const scanned = await (await scan()).json();
    const res = await postReview(json(`/api/shield/scan/${scanned.scanId}/review`, { userId: "USER_B2C_HUNG" }), {
      params: Promise.resolve({ scanId: scanned.scanId }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("REVIEW_REQUESTED");
    const log = await prisma.auditLog.findFirst({ where: { demoSessionId: sessionId, action: "SCAN_REVIEW_REQUESTED" } });
    expect(log?.targetId).toBe(scanned.scanId);
  });

  it("refuses a review request from someone other than the scan's owner", async () => {
    setLLMProviderForTest(failing);
    await consent({ optInScan: true });
    const scanned = await (await scan()).json();
    const res = await postReview(json(`/api/shield/scan/${scanned.scanId}/review`, { userId: "USER_B2C_NEW" }), {
      params: Promise.resolve({ scanId: scanned.scanId }),
    });
    expect(res.status).toBe(403);
  });

  it("404s for a scan that is not in this session", async () => {
    const res = await postReview(json("/api/shield/scan/nope/review", { userId: "USER_B2C_HUNG" }), {
      params: Promise.resolve({ scanId: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});
