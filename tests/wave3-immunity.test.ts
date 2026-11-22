import { afterAll, afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApproveImmunityResponseSchema,
  CreateAppealResponseSchema,
  ExpireDemoResponseSchema,
  ImmunityListResponseSchema,
  ResolveAppealResponseSchema,
  RollbackImmunityResponseSchema,
  ShieldScanResponseSchema,
} from "@/contracts";
import { setLLMProviderForTest, type LLMProvider } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { ensureSessionSeeded, SESSION_HEADER_NAME } from "@/lib/session";
import { GET as getImmunity } from "@/app/api/immunity/route";
import { POST as postApprove } from "@/app/api/immunity/[id]/approve/route";
import { POST as postAppeal } from "@/app/api/immunity/[id]/appeal/route";
import { POST as postResolveAppeal } from "@/app/api/immunity/[id]/resolve-appeal/route";
import { POST as postRollback } from "@/app/api/immunity/[id]/rollback/route";
import { POST as postExpireDemo } from "@/app/api/immunity/[id]/expire-demo/route";
import { POST as postShieldScan } from "@/app/api/shield/scan/route";

const TEST_SESSIONS: string[] = [];

function createSessionId(prefix: string): string {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  TEST_SESSIONS.push(id);
  return id;
}

function makeBenignMockLlmProvider(): LLMProvider {
  return {
    backend: "gemini",
    visionModel: "gemini-2.5-flash-mock",
    reasoningModel: "gemini-2.5-flash-mock",
    isConfigured: () => true,
    analyzeImage: (async () => {
      throw new Error("analyzeImage not used in Wave 3 tests");
    }) as LLMProvider["analyzeImage"],
    generateJSON: async <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>) => ({
      data: schema.parse({
        status: "ANALYZED",
        risk_score: 12,
        risk_level: "LOW",
        scam_category: "LEGITIMATE",
        visual_tampering_flags: [],
        psych_manipulation_cues: [],
        cyber_threat_flags: [],
        extracted_entities: {
          recipient_account: null,
          recipient_bank: null,
          urls: [],
          domains: [],
          amount_vnd: null,
          apk_filenames: [],
        },
        calm_guidance_vi: "Không ghi nhận dấu hiệu lừa đảo từ chỉ dấu đã kiểm tra.",
        deescalation_questions_vi: ["Bạn đã xác nhận tên người nhận chính xác chưa?"],
      }),
      modelUsed: "gemini-2.5-flash-mock",
      backend: "gemini",
      measuredLatencyMs: 5,
      repaired: false,
      usedFallback: false,
    }),
  };
}

function makeRequest(
  path: string,
  sessionId: string,
  options?: { method?: string; body?: unknown },
): Request {
  const headers = new Headers({
    [SESSION_HEADER_NAME]: sessionId,
  });
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(`http://localhost:3000${path}`, {
    method: options?.method ?? (options?.body !== undefined ? "POST" : "GET"),
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function seedPendingIndicator(params: {
  demoSessionId: string;
  indicatorValue?: string;
  indicatorType?: string;
  status?: string;
  severity?: string;
  evidenceSources?: string[];
  makerId?: string;
  caseId?: string | null;
  expiresAt?: Date;
}) {
  await ensureSessionSeeded(params.demoSessionId);
  return prisma.immunityIndicator.create({
    data: {
      demoSessionId: params.demoSessionId,
      caseId: params.caseId ?? `${params.demoSessionId}::CASE-01`,
      indicatorType: params.indicatorType ?? "BANK_ACCOUNT",
      indicatorValue: params.indicatorValue ?? "990123456789",
      severity: params.severity ?? "HIGH_RISK",
      status: params.status ?? "PENDING_CHECKER",
      evidenceSourcesJson: JSON.stringify(
        params.evidenceSources ?? ["MINUTE_0_SCAN_EVIDENCE", "GRAPH_SMURFING_DETECTOR"],
      ),
      makerId: params.makerId ?? "RISK_MAKER_HUYEN",
      checkerId: null,
      ttlHours: 720,
      expiresAt: params.expiresAt ?? new Date(Date.now() + 720 * 3_600_000),
    },
  });
}

afterEach(() => {
  setLLMProviderForTest(null);
});

afterAll(async () => {
  if (TEST_SESSIONS.length > 0) {
    await prisma.$transaction([
      prisma.appeal.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
      prisma.immunityIndicator.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
      prisma.investigationCase.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
      prisma.heldTransaction.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
      prisma.scanSession.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
      prisma.userConsent.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
      prisma.auditLog.deleteMany({ where: { demoSessionId: { in: TEST_SESSIONS } } }),
    ]);
  }
});

describe("Wave 3 — 4-Layer Community Immunity Governance & Closed-Loop Feedback", () => {
  it("blocks Maker self-approval with 403 MAKER_CHECKER_CONFLICT and non-Checker roles with 403 FORBIDDEN_ROLE", async () => {
    const sessionId = createSessionId("w3-rbac");
    const ind = await seedPendingIndicator({ demoSessionId: sessionId });

    // Maker self-approve with RISK_MAKER role (as in UI role switcher)
    const selfMakerRes = await postApprove(
      makeRequest(`/api/immunity/${ind.indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_MAKER_HUYEN",
          checkerRole: "RISK_MAKER",
          rationale: "Tự phê duyệt đề xuất của mình",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(selfMakerRes.status).toBe(403);
    const selfMakerJson = (await selfMakerRes.json()) as { code: string; error: string };
    expect(selfMakerJson.code).toBe("MAKER_CHECKER_CONFLICT");
    expect(selfMakerJson.error).toContain("Maker–Checker");

    // Maker self-approve even if role header is spoofed as RISK_CHECKER
    const spoofedRes = await postApprove(
      makeRequest(`/api/immunity/${ind.indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_MAKER_HUYEN",
          checkerRole: "RISK_CHECKER",
          rationale: "Giả vai Checker nhưng vẫn trùng makerId",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(spoofedRes.status).toBe(403);
    expect(((await spoofedRes.json()) as { code: string }).code).toBe("MAKER_CHECKER_CONFLICT");

    // Non-Checker role (different actorId) -> 403 FORBIDDEN_ROLE
    const nonCheckerRes = await postApprove(
      makeRequest(`/api/immunity/${ind.indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "USER_B2C_HUNG",
          checkerRole: "USER_B2C",
          rationale: "Người dùng B2C không có quyền Checker",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(nonCheckerRes.status).toBe(403);
    expect(((await nonCheckerRes.json()) as { code: string }).code).toBe("FORBIDDEN_ROLE");
  });

  it("blocks Layer 2 ACTIVE approval with 400 INSUFFICIENT_EVIDENCE_SOURCES when < 2 unique sources", async () => {
    const sessionId = createSessionId("w3-sources");
    const singleSourceInd = await seedPendingIndicator({
      demoSessionId: sessionId,
      status: "SOFT_WARNING",
      severity: "SOFT_WARNING",
      evidenceSources: ["SINGLE_USER_REPORT", "SINGLE_USER_REPORT"],
    });

    const res = await postApprove(
      makeRequest(`/api/immunity/${singleSourceInd.indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Thử nâng lên ACTIVE khi chỉ có 1 nguồn trùng lặp",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: singleSourceInd.indicatorId }) },
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string; error: string };
    expect(json.code).toBe("INSUFFICIENT_EVIDENCE_SOURCES");
    expect(json.error).toContain("tối thiểu 2 nguồn");
  });

  it("approves >=2-source indicator, closes linked case, and triggers instant Tier-1 B2C warning", async () => {
    const sessionId = createSessionId("w3-closed-loop");
    const ind = await seedPendingIndicator({
      demoSessionId: sessionId,
      indicatorValue: "990123456789",
      evidenceSources: ["MINUTE_0_SCAN_EVIDENCE", "GRAPH_SMURFING_DETECTOR"],
    });

    const approveRes = await postApprove(
      makeRequest(`/api/immunity/${ind.indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Đã xác minh 2 nguồn độc lập (Phút 00 + Đồ thị Smurfing).",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(approveRes.status).toBe(200);
    const approveData = ApproveImmunityResponseSchema.parse(await approveRes.json());
    expect(approveData.indicator.status).toBe("ACTIVE");
    expect(approveData.indicator.severity).toBe("HIGH_RISK");
    expect(approveData.indicator.checkerId).toBe("RISK_CHECKER_TUAN");

    // Linked investigation case should be marked CLOSED
    const linkedCase = await prisma.investigationCase.findUnique({
      where: { caseId: `${sessionId}::CASE-01` },
    });
    expect(linkedCase?.status).toBe("CLOSED");

    // B2C USER_B2C_NEW scan immediately matches Tier 1 Pre-Vision Immunity
    const scanRes = await postShieldScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          recipientAccount: "990123456789",
          lookupText: "Kiểm tra số tài khoản 990123456789",
        },
      }),
    );
    expect(scanRes.status).toBe(200);
    const scanData = ShieldScanResponseSchema.parse(await scanRes.json());
    expect(scanData.immunityHit).not.toBeNull();
    expect(scanData.immunityHit?.status).toBe("ACTIVE");
    expect(scanData.immunityTierMatched).toBe("TIER_1_PRE_VISION");
    expect(scanData.measuredLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("handles TT 53/2026 human appeal -> OVERTURNED_ROLLBACK and immediately clears B2C warning", async () => {
    const sessionId = createSessionId("w3-appeal");
    setLLMProviderForTest(makeBenignMockLlmProvider());

    const ind = await seedPendingIndicator({
      demoSessionId: sessionId,
      indicatorValue: "990123456789",
      status: "ACTIVE",
    });

    // Submit appeal
    const appealRes = await postAppeal(
      makeRequest(`/api/immunity/${ind.indicatorId}/appeal`, sessionId, {
        body: {
          appellantName: "Chủ hộ kinh doanh Hoa (Mô phỏng)",
          appellantNote: "Đây là tài khoản bán hàng hợp lệ, gửi chứng từ đối soát theo TT 53/2026.",
          actorId: "USER_B2C_NEW",
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(appealRes.status).toBe(201);
    const { appeal } = CreateAppealResponseSchema.parse(await appealRes.json());
    expect(appeal.status).toBe("PENDING_HUMAN_REVIEW");

    // Non-Checker cannot resolve appeal
    const forbiddenResolve = await postResolveAppeal(
      makeRequest(`/api/immunity/${ind.indicatorId}/resolve-appeal`, sessionId, {
        body: {
          appealId: appeal.appealId,
          reviewerId: "RISK_MAKER_HUYEN",
          reviewerRole: "RISK_MAKER",
          resolution: "OVERTURNED_ROLLBACK",
          resolutionNote: "Maker không được phép giải quyết khiếu nại",
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(forbiddenResolve.status).toBe(403);

    // Checker resolves as OVERTURNED_ROLLBACK
    const resolveRes = await postResolveAppeal(
      makeRequest(`/api/immunity/${ind.indicatorId}/resolve-appeal`, sessionId, {
        body: {
          appealId: appeal.appealId,
          reviewerId: "RISK_CHECKER_TUAN",
          reviewerRole: "RISK_CHECKER",
          resolution: "OVERTURNED_ROLLBACK",
          resolutionNote: "Đã xác minh chứng từ hợp lệ, gỡ cảnh báo ngay lập tức.",
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(resolveRes.status).toBe(200);
    const resolved = ResolveAppealResponseSchema.parse(await resolveRes.json());
    expect(resolved.appeal.status).toBe("OVERTURNED_ROLLBACK");
    expect(resolved.indicator.status).toBe("ROLLED_BACK");

    // Audit logs contain APPEAL_SUBMITTED, APPEAL_RESOLVED, and IMMUNITY_ROLLED_BACK
    const regRes = await getImmunity(makeRequest("/api/immunity", sessionId));
    const regData = ImmunityListResponseSchema.parse(await regRes.json());
    const actions = regData.auditLogs.map((l) => l.action);
    expect(actions).toContain("APPEAL_SUBMITTED");
    expect(actions).toContain("APPEAL_RESOLVED");
    expect(actions).toContain("IMMUNITY_ROLLED_BACK");

    // B2C scan immediately returns immunityHit === null
    const scanAfter = await postShieldScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          recipientAccount: "990123456789",
          lookupText: "Kiểm tra lại số tài khoản 990123456789 sau khi Rollback",
        },
      }),
    );
    expect(scanAfter.status).toBe(200);
    const scanAfterData = ShieldScanResponseSchema.parse(await scanAfter.json());
    expect(scanAfterData.immunityHit).toBeNull();
    expect(scanAfterData.immunityTierMatched).toBe("NONE");

    // Submitting a new appeal against ROLLED_BACK indicator fails with 409
    const duplicateAppealRes = await postAppeal(
      makeRequest(`/api/immunity/${ind.indicatorId}/appeal`, sessionId, {
        body: {
          appellantName: "Chủ tài khoản",
          appellantNote: "Khiếu nại lại trên chỉ báo đã thu hồi",
          actorId: "USER_B2C_NEW",
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(duplicateAppealRes.status).toBe(409);
  });

  it("supports direct instant Rollback with IMMUNITY_ROLLED_BACK audit log", async () => {
    const sessionId = createSessionId("w3-rollback");
    const ind = await seedPendingIndicator({
      demoSessionId: sessionId,
      indicatorValue: "880112233445",
      status: "ACTIVE",
    });

    const res = await postRollback(
      makeRequest(`/api/immunity/${ind.indicatorId}/rollback`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          reason: "Thu hồi khẩn cấp do phát hiện nhầm lẫn đối tác hợp lệ.",
        },
      }),
      { params: Promise.resolve({ id: ind.indicatorId }) },
    );
    expect(res.status).toBe(200);
    const data = RollbackImmunityResponseSchema.parse(await res.json());
    expect(data.indicator.status).toBe("ROLLED_BACK");
    expect(data.indicator.rollbackReason).toContain("Thu hồi khẩn cấp");

    const logs = await prisma.auditLog.findMany({
      where: { demoSessionId: sessionId, action: "IMMUNITY_ROLLED_BACK", targetId: ind.indicatorId },
    });
    expect(logs.length).toBe(1);
  });

  it("supports Layer 3 TTL Expire-Demo and automatic expiry on GET /api/immunity", async () => {
    const sessionId = createSessionId("w3-expire");
    setLLMProviderForTest(makeBenignMockLlmProvider());

    const activeInd = await seedPendingIndicator({
      demoSessionId: sessionId,
      indicatorValue: "990123456789",
      status: "ACTIVE",
    });
    const staleInd = await seedPendingIndicator({
      demoSessionId: sessionId,
      indicatorType: "URL_DOMAIN",
      indicatorValue: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
      status: "SOFT_WARNING",
      severity: "SOFT_WARNING",
      expiresAt: new Date(Date.now() - 60_000),
    });

    // Expire activeInd via expire-demo endpoint
    const expireRes = await postExpireDemo(
      makeRequest(`/api/immunity/${activeInd.indicatorId}/expire-demo`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Kiểm chứng Lớp 3 TTL (MẪU MÔ PHỎNG)",
        },
      }),
      { params: Promise.resolve({ id: activeInd.indicatorId }) },
    );
    expect(expireRes.status).toBe(200);
    const expireData = ExpireDemoResponseSchema.parse(await expireRes.json());
    expect(expireData.indicator.status).toBe("EXPIRED");

    // GET /api/immunity auto-expires staleInd and returns IMMUNITY_EXPIRED_DEMO audit log
    const listRes = await getImmunity(makeRequest("/api/immunity", sessionId));
    expect(listRes.status).toBe(200);
    const listData = ImmunityListResponseSchema.parse(await listRes.json());
    const staleAfter = listData.indicators.find((i) => i.indicatorId === staleInd.indicatorId);
    expect(staleAfter?.status).toBe("EXPIRED");
    expect(listData.auditLogs.some((l) => l.action === "IMMUNITY_EXPIRED_DEMO")).toBe(true);

    // B2C scan returns immunityHit === null after expiry
    const scanAfter = await postShieldScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          recipientAccount: "990123456789",
          lookupText: "Kiểm tra số tài khoản 990123456789 sau khi hết hạn TTL",
        },
      }),
    );
    expect(scanAfter.status).toBe(200);
    const scanData = ShieldScanResponseSchema.parse(await scanAfter.json());
    expect(scanData.immunityHit).toBeNull();
  });

  it("enforces strict demoSessionId isolation between Session A and Session B", async () => {
    const sessionA = createSessionId("w3-iso-a");
    const sessionB = createSessionId("w3-iso-b");
    setLLMProviderForTest(makeBenignMockLlmProvider());

    const indA = await seedPendingIndicator({
      demoSessionId: sessionA,
      indicatorValue: "990123456789",
    });

    const approveA = await postApprove(
      makeRequest(`/api/immunity/${indA.indicatorId}/approve`, sessionA, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Phê duyệt chỉ trong phiên A",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: indA.indicatorId }) },
    );
    expect(approveA.status).toBe(200);

    // Session B cannot see or mutate Session A's indicator
    const listB = await getImmunity(makeRequest("/api/immunity", sessionB));
    const listBData = ImmunityListResponseSchema.parse(await listB.json());
    expect(listBData.indicators.some((i) => i.indicatorId === indA.indicatorId)).toBe(false);

    const crossRollback = await postRollback(
      makeRequest(`/api/immunity/${indA.indicatorId}/rollback`, sessionB, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          reason: "Cố gắng thu hồi chéo phiên",
        },
      }),
      { params: Promise.resolve({ id: indA.indicatorId }) },
    );
    expect(crossRollback.status).toBe(404);

    // Session B B2C scan does not see Session A's ACTIVE indicator
    const scanB = await postShieldScan(
      makeRequest("/api/shield/scan", sessionB, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          recipientAccount: "990123456789",
          lookupText: "Tra cứu 990123456789 từ phiên B độc lập",
        },
      }),
    );
    expect(scanB.status).toBe(200);
    const scanBData = ShieldScanResponseSchema.parse(await scanB.json());
    expect(scanBData.immunityHit).toBeNull();
  });
});
