import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  CaseDecisionRequestSchema,
  DEMO_SIMULATION_LABEL,
  NEUTRAL_HOLD_MESSAGE,
  ScanResultSchema,
  ShieldScanRequestSchema,
  WarRoomDebateSchema,
} from "@/contracts";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  ensureSessionSeeded,
  getSessionId,
  resetDemoSession,
  sanitizeSessionId,
} from "@/lib/session";

describe("Wave 0 — Frozen Contracts & Product Guardrails", () => {
  it("enforces exact neutral hold message with no authority impersonation", () => {
    expect(NEUTRAL_HOLD_MESSAGE).toBe(
      "Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập).",
    );
    expect(NEUTRAL_HOLD_MESSAGE.toLowerCase()).not.toContain("nhnn");
    expect(NEUTRAL_HOLD_MESSAGE.toLowerCase()).not.toContain("công an");
    expect(DEMO_SIMULATION_LABEL).toBe("MẪU MÔ PHỎNG");
  });

  it("validates ScanResultSchema and rejects out-of-range risk scores", () => {
    const valid = ScanResultSchema.parse({
      status: "ANALYZED",
      risk_score: 92,
      risk_level: "CRITICAL",
      scam_category: "POLICE_IMPERSONATION",
      visual_tampering_flags: ["Dấu đỏ ghép lệch"],
      psych_manipulation_cues: [
        {
          type: "SECRECY_ISOLATION",
          quote_vi: "Không được báo cho con cái biết",
          explanation_vi: "Kẻ gian cố cô lập nạn nhân khỏi người thân.",
        },
      ],
      cyber_threat_flags: [],
      extracted_entities: {
        recipient_account: "990123456789",
        recipient_bank: "SIM_BANK",
        urls: [],
        domains: [],
        amount_vnd: 9_500_000,
        apk_filenames: [],
      },
      calm_guidance_vi: "Bác hãy bình tĩnh dừng lại và gọi xác minh với con gái.",
      deescalation_questions_vi: ["Cơ quan công an có bao giờ làm việc qua Zalo không?"],
    });
    expect(valid.risk_score).toBe(92);

    const invalid = ScanResultSchema.safeParse({ ...valid, risk_score: 120 });
    expect(invalid.success).toBe(false);
  });

  it("validates WarRoomDebateSchema including AGENT_DEGRADED and synthesis", () => {
    const debate = WarRoomDebateSchema.parse({
      agents: {
        graph_tracer: {
          status: "OK",
          latency_ms: 410,
          flagged_node_ids: ["ACC_MULE_01"],
          smurfing_detected: true,
          mule_cluster_detected: true,
          key_findings: ["4 lệnh 9,5 triệu né ngưỡng 10 triệu QĐ 2345"],
          risk_contribution: 90,
        },
        evidence_correlator: {
          status: "OK",
          latency_ms: 350,
          minute0_matched: true,
          simo_flag_matched: true,
          cyber_indicator_matched: false,
          independent_sources: ["MINUTE_0_ZALO_SCAN", "GRAPH_SMURFING_MULE"],
          key_findings: ["Trùng khớp TK 990123456789 từ ảnh Phút 00"],
          risk_contribution: 88,
        },
        compliance_rag: {
          status: "AGENT_DEGRADED",
          latency_ms: 1500,
          cited_chunks: [],
          policy_notes_vi: [],
          insurance_eligibility_vi: "Cần chuyên viên rà soát thủ công.",
          human_review_required: true,
          error_message: "Timeout",
        },
        false_positive_defender: {
          status: "OK",
          latency_ms: 390,
          innocence_confidence: 12,
          benign_signals: [],
          counter_arguments_vi: ["Không tìm thấy lịch sử thương mại sạch."],
          recommend_dismiss: false,
        },
      },
      synthesis: {
        recommendation: "RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY",
        eligible_for_active_immunity: true,
        eligibility_reason_vi: "Đủ 2 nguồn bằng chứng độc lập.",
        independent_sources: ["MINUTE_0_ZALO_SCAN", "GRAPH_SMURFING_MULE"],
        risk_summary_points: ["Phát hiện chia nhỏ 4×9,5M"],
        defense_summary_points: ["Không có bằng chứng minh oan"],
        cskh_empathetic_card: {
          customer_anxiety_level: "HIGH",
          funds_status_vi: "Tiền đang an toàn 100% trong trạng thái tạm giữ 24h.",
          empathetic_openers_vi: [
            "Cháu hiểu bác đang rất lo lắng, tiền của bác hiện vẫn an toàn trong ví.",
          ],
          do_not_say_vi: ["Không đổ lỗi cho khách hàng."],
        },
      },
      retrieved_chunks: [],
      total_latency_ms: 1520,
      model_used: "gemini-2.5-flash",
    });

    expect(debate.agents.compliance_rag.status).toBe("AGENT_DEGRADED");
  });

  it("enforces ShieldScanRequestSchema and CaseDecisionRequestSchema boundaries", () => {
    expect(
      ShieldScanRequestSchema.safeParse({ inputType: "IMAGE" }).success,
    ).toBe(false);

    expect(
      CaseDecisionRequestSchema.safeParse({
        decision: "PROPOSE_IMMUNITY",
        actorId: "RISK_MAKER_HUYEN",
        actorRole: "RISK_MAKER",
        rationale: "Đủ 2 nguồn độc lập",
        indicatorType: "BANK_ACCOUNT",
        indicatorValue: "990123456789",
        requestedLevel: "ACTIVE",
        evidenceSources: ["MINUTE_0", "GRAPH_MULE"],
      }).success,
    ).toBe(true);
  });
});

describe("Wave 0 — Rate Limiter & Session Slug Sanitization", () => {
  it("sanitizes session slugs strictly and survives malformed percent-encoded cookies", () => {
    expect(sanitizeSessionId("judge-01")).toBe("judge-01");
    expect(sanitizeSessionId("../etc/passwd")).toBeNull();
    expect(sanitizeSessionId("a".repeat(65))).toBeNull();

    const malformedReq = new Request("http://localhost:3000/api/session", {
      headers: { cookie: "tl_session=%E0%A4%A" },
    });
    expect(getSessionId(malformedReq)).toBe("default");
  });

  it("enforces sliding-window boundary per ip + sessionId", () => {
    const limiter = createRateLimiter({
      maxRequests: 2,
      windowMs: 1000,
      bypassInTest: false,
    });

    const t0 = 10_000;
    expect(limiter.check("1.2.3.4", "sess-a", t0).allowed).toBe(true);
    expect(limiter.check("1.2.3.4", "sess-a", t0 + 100).allowed).toBe(true);

    const blocked = limiter.check("1.2.3.4", "sess-a", t0 + 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);

    // Different session on same IP has independent budget
    expect(limiter.check("1.2.3.4", "sess-b", t0 + 200).allowed).toBe(true);

    // After window slides past t0, budget opens again
    expect(limiter.check("1.2.3.4", "sess-a", t0 + 1001).allowed).toBe(true);
  });

  it("bypasses rate limiting in NODE_ENV=test by default", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("1.2.3.4", "sess-test").allowed).toBe(true);
    expect(limiter.check("1.2.3.4", "sess-test").allowed).toBe(true);
  });
});

describe("Wave 0 — Session-Scoped Reset Isolation & Concurrent Seeding", () => {
  const sessionA = `wave0-iso-a-${Date.now()}`;
  const sessionB = `wave0-iso-b-${Date.now()}`;
  const sessionConcurrent = `wave0-concurrent-${Date.now()}`;

  afterAll(async () => {
    const ids = [sessionA, sessionB, sessionConcurrent];
    await prisma.$transaction([
      prisma.appeal.deleteMany({ where: { demoSessionId: { in: ids } } }),
      prisma.immunityIndicator.deleteMany({ where: { demoSessionId: { in: ids } } }),
      prisma.investigationCase.deleteMany({ where: { demoSessionId: { in: ids } } }),
      prisma.heldTransaction.deleteMany({ where: { demoSessionId: { in: ids } } }),
      prisma.scanSession.deleteMany({ where: { demoSessionId: { in: ids } } }),
      prisma.userConsent.deleteMany({ where: { demoSessionId: { in: ids } } }),
      prisma.auditLog.deleteMany({ where: { demoSessionId: { in: ids } } }),
    ]);
  });

  it("handles concurrent cold-session seeding without duplicating CASE-01/02/03", async () => {
    const counts = await Promise.all([
      ensureSessionSeeded(sessionConcurrent),
      ensureSessionSeeded(sessionConcurrent),
      ensureSessionSeeded(sessionConcurrent),
    ]);
    expect(counts).toEqual([3, 3, 3]);

    const cases = await prisma.investigationCase.findMany({
      where: { demoSessionId: sessionConcurrent },
      orderBy: { scenarioCode: "asc" },
    });
    expect(cases).toHaveLength(3);
    expect(cases.map((c) => c.caseId)).toEqual([
      `${sessionConcurrent}::CASE-01`,
      `${sessionConcurrent}::CASE-02`,
      `${sessionConcurrent}::CASE-03`,
    ]);
  });

  it("resetting Session A does not wipe Session B data", async () => {
    await ensureSessionSeeded(sessionA);
    await ensureSessionSeeded(sessionB);

    await prisma.userConsent.update({
      where: { demoSessionId_userId: { demoSessionId: sessionA, userId: "USER_B2C_HUNG" } },
      data: { optIn24hHold: true, guardianId: "FAMILY_MINH" },
    });
    await prisma.userConsent.update({
      where: { demoSessionId_userId: { demoSessionId: sessionB, userId: "USER_B2C_HUNG" } },
      data: { optIn24hHold: true, guardianId: "FAMILY_MINH" },
    });

    await prisma.heldTransaction.create({
      data: {
        demoSessionId: sessionA,
        senderId: "USER_B2C_HUNG",
        senderLabel: "Bác Hùng (Mô phỏng)",
        recipientAccount: "990123456789",
        recipientBank: "SIM_BANK",
        amountVnd: 9_500_000,
        status: "ON_HOLD_24H",
        neutralMessage: NEUTRAL_HOLD_MESSAGE,
        holdExpiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await prisma.heldTransaction.create({
      data: {
        demoSessionId: sessionB,
        senderId: "USER_B2C_HUNG",
        senderLabel: "Bác Hùng (Mô phỏng)",
        recipientAccount: "990123456789",
        recipientBank: "SIM_BANK",
        amountVnd: 9_500_000,
        status: "ON_HOLD_24H",
        neutralMessage: NEUTRAL_HOLD_MESSAGE,
        holdExpiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const resetResult = await resetDemoSession(sessionA);
    expect(resetResult.seededCasesCount).toBe(3);

    const [holdsA, holdsB, consentA, consentB, casesA, casesB] = await Promise.all([
      prisma.heldTransaction.findMany({ where: { demoSessionId: sessionA } }),
      prisma.heldTransaction.findMany({ where: { demoSessionId: sessionB } }),
      prisma.userConsent.findUnique({
        where: { demoSessionId_userId: { demoSessionId: sessionA, userId: "USER_B2C_HUNG" } },
      }),
      prisma.userConsent.findUnique({
        where: { demoSessionId_userId: { demoSessionId: sessionB, userId: "USER_B2C_HUNG" } },
      }),
      prisma.investigationCase.count({ where: { demoSessionId: sessionA } }),
      prisma.investigationCase.count({ where: { demoSessionId: sessionB } }),
    ]);

    expect(holdsA).toHaveLength(0);
    expect(consentA?.optIn24hHold).toBe(false);
    expect(casesA).toBe(3);

    expect(holdsB).toHaveLength(1);
    expect(consentB?.optIn24hHold).toBe(true);
    expect(casesB).toBe(3);
  });
});

describe("Wave 0 — Pre-Commit Secret Regex Guard", () => {
  it("matches forbidden API key and private key patterns", () => {
    const hookPath = path.resolve(process.cwd(), ".githooks/pre-commit");
    const hookText = readFileSync(hookPath, "utf8");
    const match = hookText.match(/SECRET_PATTERN='([^']+)'/);
    expect(match).not.toBeNull();

    const pattern = new RegExp(match![1]);
    // Synthetically assembled strings to avoid tripping pre-commit on this test file
    const fakeGoogle = "AIza" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r";
    const fakeOpenAi = "sk-" + "1234567890abcdefghij1234";
    const fakeAws = "AKIA" + "0123456789ABCDEF";
    const fakeGh = "ghp_" + "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8";
    const fakePem = "-----BEGIN " + "RSA PRIVATE KEY-----";

    expect(pattern.test(fakeGoogle)).toBe(true);
    expect(pattern.test(fakeOpenAi)).toBe(true);
    expect(pattern.test(fakeAws)).toBe(true);
    expect(pattern.test(fakeGh)).toBe(true);
    expect(pattern.test(fakePem)).toBe(true);
    expect(pattern.test("GEMINI_API_KEY=\"\"")).toBe(false);
  });
});
