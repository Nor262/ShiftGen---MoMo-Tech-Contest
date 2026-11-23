import { afterAll, afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CaseDecisionResponseSchema,
  IMMUNITY_TTL_HOURS,
  InvestigateCaseResponseSchema,
  WarRoomCasesResponseSchema,
  WarRoomSseEventSchema,
  type DebateSynthesis,
  type WarRoomSseEvent,
} from "@/contracts";
import { SCENARIO_FIXTURES } from "@/data/scenarios";
import rawPolicies from "@/data/vnPolicies.json";
import {
  deriveVerifiedIndependentSources,
  retrievePolicyChunks,
  runWarRoomInvestigation,
} from "@/lib/agents";
import { setLLMProviderForTest, type LLMProvider } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { getVietnamDateKey } from "@/lib/session";
import { GET as getWarRoomCases } from "@/app/api/warroom/cases/route";
import { POST as postInvestigate } from "@/app/api/warroom/cases/[caseId]/investigate/route";
import { POST as postDecision } from "@/app/api/warroom/cases/[caseId]/decision/route";

const TEST_SESSIONS: string[] = [];

function createSessionId(prefix: string): string {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  TEST_SESSIONS.push(id);
  return id;
}

function makeMockWarRoomProvider(options?: {
  configured?: boolean;
  failAgent?: "graph_tracer" | "evidence_correlator" | "compliance_rag" | "false_positive_defender";
  hallucinateGraphAndCitations?: boolean;
  forceEligibleClaim?: boolean;
  recommendDismissFp?: boolean;
  modelUsed?: string;
}): LLMProvider {
  const modelUsed = options?.modelUsed ?? "gemini-2.5-flash-mock";
  const configured = options?.configured ?? true;

  return {
    backend: "gemini",
    visionModel: modelUsed,
    reasoningModel: modelUsed,
    isConfigured: () => configured,
    analyzeImage: (async () => {
      throw new Error("analyzeImage not used in War-Room tests");
    }) as LLMProvider["analyzeImage"],
    generateJSON: async <T>(
      schema: z.ZodType<T, z.ZodTypeDef, unknown>,
      input: { systemPrompt: string; userPrompt: string },
    ) => {
      const sys = input.systemPrompt;

      if (sys.includes("Graph & Smurfing Tracer Agent")) {
        if (options?.failAgent === "graph_tracer") {
          throw new Error("Simulated graph_tracer failure");
        }
        const raw = options?.hallucinateGraphAndCitations
          ? {
              flagged_node_ids: ["HALLUCINATED_NODE_999"],
              smurfing_detected: false,
              mule_cluster_detected: false,
              key_findings: ["Phân tích đồ thị dòng tiền hoàn tất."],
              risk_contribution: 90,
            }
          : {
              flagged_node_ids: [],
              smurfing_detected: false,
              mule_cluster_detected: false,
              key_findings: [
                options?.recommendDismissFp
                  ? "35 giao dịch nhỏ 150k–450k từ 35 người mua độc lập, không có dấu hiệu smurfing hay cụm mule."
                  : "Phát hiện cấu trúc dòng tiền bất thường phù hợp báo cáo đồ thị tất định.",
              ],
              risk_contribution: options?.recommendDismissFp ? 10 : 88,
            };
        return {
          data: schema.parse(raw),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 12,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("Pre-App Evidence Correlator Agent")) {
        if (options?.failAgent === "evidence_correlator") {
          throw new Error("Simulated evidence_correlator malformed JSON failure");
        }
        const raw = {
          minute0_matched: !options?.recommendDismissFp,
          simo_flag_matched: false,
          cyber_indicator_matched: false,
          independent_sources: options?.forceEligibleClaim
            ? ["FAKE_SOURCE_1", "FAKE_SOURCE_2", "FAKE_SOURCE_3"]
            : [],
          key_findings: [
            options?.recommendDismissFp
              ? "Không có báo cáo Phút 00, không có cờ SIMO hay chỉ báo mã độc."
              : "Đã đối chiếu chéo dữ liệu Phút 00 với tín hiệu nội bộ.",
          ],
          risk_contribution: options?.recommendDismissFp ? 5 : 80,
        };
        return {
          data: schema.parse(raw),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 14,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("Compliance & Policy RAG Agent")) {
        if (options?.failAgent === "compliance_rag") {
          throw new Error("Simulated compliance_rag timeout");
        }
        const raw = {
          cited_chunk_ids: options?.hallucinateGraphAndCitations
            ? ["PCRT29-01", "FABRICATED-LAW-999", "TT53-01"]
            : ["PCRT29-01", "AUTH-THRESHOLD-01", "TT77-01", "TT53-01", "LAW134-01", "PCRT-STR-01"],
          policy_notes_vi: [
            "Áp dụng quy trình giải trình 2 chiều và lưu vết kiểm toán theo TT 53/2026/TT-NHNN.",
            "Không tự động khóa vĩnh viễn thiếu phê duyệt chuyên viên theo Luật AI 134/2025 Điều 4.",
          ],
          insurance_eligibility_vi:
            "Bảo hiểm An toàn chuyển tiền MoMo có mức bảo vệ ≤ 2 triệu đồng và có điều khoản loại trừ cần đối chiếu; ưu tiên phòng ngừa ở Phút 00.",
          human_review_required: true,
        };
        return {
          data: schema.parse(raw),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 11,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("False-Positive Defender Agent")) {
        if (options?.failAgent === "false_positive_defender") {
          throw new Error("Simulated false_positive_defender error");
        }
        const isBenign = Boolean(options?.recommendDismissFp);
        const raw = isBenign
          ? {
              innocence_confidence: 94,
              benign_signals: [
                "14 tháng lịch sử sạch, 0 khiếu nại",
                "35 người mua độc lập trên thiết bị và IP riêng biệt",
                "Thiết bị chính chủ cố định, không có báo cáo Phút 00",
              ],
              counter_arguments_vi: [
                "Mô thức 35 đơn nhỏ 150k–450k trong khung 20h–21h phù hợp hoạt động bán hàng livestream hợp pháp của tiểu thương.",
                "Không nên đóng băng ví gây gián đoạn sinh kế; đề xuất đóng cảnh báo giả (Dismiss FP).",
              ],
              recommend_dismiss: true,
            }
          : {
              innocence_confidence: 12,
              benign_signals: [],
              counter_arguments_vi: [
                "Không tìm thấy lịch sử thương nhân sạch để minh oan; tuy nhiên vẫn cần rà soát 2 cấp Maker–Checker theo Luật AI 134/2025.",
              ],
              recommend_dismiss: false,
            };
        return {
          data: schema.parse(raw),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 13,
          repaired: false,
          usedFallback: false,
        };
      }

      // Step 5: DebateSynthesizer
      const synthesis: DebateSynthesis = options?.recommendDismissFp
        ? {
            recommendation: "RECOMMEND_DISMISS_FP",
            eligible_for_active_immunity: false,
            eligibility_reason_vi:
              "0 nguồn bằng chứng gian lận độc lập; hồ sơ thể hiện rõ hoạt động kinh doanh livestream hợp lệ.",
            independent_sources: [],
            risk_summary_points: ["Cảnh báo ban đầu kích hoạt do mật độ giao dịch tăng đột biến khung 20h–21h."],
            defense_summary_points: [
              "14 tháng lịch sử sạch, 0 khiếu nại, 35 người mua độc lập trên 35 thiết bị khác nhau.",
              "Không phát hiện smurfing QĐ 2345 hay cụm mule.",
            ],
            cskh_empathetic_card: {
              customer_anxiety_level: "LOW",
              funds_status_vi: "Tài khoản và toàn bộ doanh thu bán hàng của chị vẫn an toàn, không bị hạn chế.",
              empathetic_openers_vi: [
                "Chào chị Hoa, hệ thống vừa hoàn tất kiểm tra nhanh phiên bán hàng tối nay và xác nhận giao dịch hoàn toàn bình thường.",
                "Cảm ơn chị đã đồng hành cùng MoMo; nếu cần hỗ trợ về đối soát đơn hàng livestream, em luôn sẵn sàng hỗ trợ ạ.",
              ],
              do_not_say_vi: [
                "Không thông báo tài khoản có dấu hiệu lừa đảo khi chưa có căn cứ.",
                "Không tự nhận đại diện cơ quan nhà nước hay ngân hàng nhà nước.",
              ],
            },
          }
        : {
            recommendation: "RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY",
            eligible_for_active_immunity: options?.forceEligibleClaim ? true : true,
            eligibility_reason_vi: options?.forceEligibleClaim
              ? "Đủ điều kiện đưa thẳng lên Lớp 2 ACTIVE."
              : "Có đủ bằng chứng đối chứng độc lập để Maker xem xét đề xuất Kho Miễn dịch.",
            independent_sources: options?.forceEligibleClaim
              ? ["FAKE_A", "FAKE_B", "FAKE_C"]
              : ["MINUTE0_B2C_EVIDENCE", "INTERNAL_GRAPH_SMURFING_MULE"],
            risk_summary_points: [
              "Phát hiện dấu hiệu rủi ro cao từ đối chiếu đa tín hiệu.",
            ],
            defense_summary_points: [
              "Yêu cầu chuyên viên người thật rà soát và áp dụng quy trình Maker–Checker.",
            ],
            cskh_empathetic_card: {
              customer_anxiety_level: "HIGH",
              funds_status_vi:
                "Khoản tiền đang nằm trong trạng thái tạm giữ bảo vệ 24h theo chế độ khách hàng đã bật, chưa rời khỏi hệ thống.",
              empathetic_openers_vi: [
                "Chào bác, cháu gọi từ bộ phận Hỗ trợ Khách hàng MoMo để xác nhận tiền của bác vẫn đang được giữ an toàn trong ví.",
                "Bác cứ bình tĩnh nhé, cháu và gia đình sẽ cùng bác kiểm tra kỹ giao dịch này trước khi quyết định.",
              ],
              do_not_say_vi: [
                "Không đổ lỗi cho khách hàng vì đã tin kẻ gian.",
                "Không mạo danh Công an, Tòa án hoặc Ngân hàng Nhà nước.",
                "Không cam kết bồi thường bảo hiểm tự động ngoài điều khoản ≤ 2 triệu đồng.",
              ],
            },
          };

      return {
        data: schema.parse(synthesis),
        modelUsed,
        backend: "gemini",
        measuredLatencyMs: 16,
        repaired: false,
        usedFallback: false,
      };
    },
  };
}

afterEach(async () => {
  setLLMProviderForTest(null);
  const dateKey = getVietnamDateKey();
  await prisma.dailyLlmUsage.deleteMany({ where: { dateKey } });
});

afterAll(async () => {
  setLLMProviderForTest(null);
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

describe("Wave 2 — Grounded BM25 Policy Retriever (lib/agents/retriever.ts)", () => {
  const validChunkIds = new Set(rawPolicies.map((p) => p.chunk_id));

  it("retrieves AML Art. 29 smurfing and biometric-threshold chunks for near-threshold split transfer queries", () => {
    const chunks = retrievePolicyChunks("smurfing chia nhỏ 9.5 triệu dưới 10 triệu mule thiết bị", 5);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chunk_id).toBe("PCRT29-01");
    expect(chunks.some((c) => c.chunk_id === "AUTH-THRESHOLD-01")).toBe(true);
    for (const c of chunks) {
      expect(validChunkIds.has(c.chunk_id)).toBe(true);
    }
  });

  it("retrieves TT 77 chunk for APK Accessibility malware queries", () => {
    const chunks = retrievePolicyChunks("Thông tư 77 cài tệp .apk lạm dụng Accessibility Services", 5);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chunk_id).toBe("TT77-01");
  });

  it("retrieves TT 53 human review & audit chunks for appeal and governance queries", () => {
    const chunks = retrievePolicyChunks("TT 53 khiếu nại human review con người can thiệp", 5);
    expect(chunks.length).toBeGreaterThan(0);
    const topIds = chunks.slice(0, 2).map((c) => c.chunk_id);
    expect(topIds).toContain("TT53-01");
    expect(topIds).toContain("LAW134-01");
  });

  it("retrieves MoMo insurance chunks for transfer insurance queries and returns empty on blank query", () => {
    const chunks = retrievePolicyChunks("Bảo hiểm An toàn chuyển tiền MoMo 2 triệu loại trừ", 5);
    expect(chunks.length).toBeGreaterThan(0);
    const topIds = chunks.slice(0, 2).map((c) => c.chunk_id);
    expect(topIds).toContain("MOMO-INS-01");
    expect(retrievePolicyChunks("   ", 5)).toEqual([]);
  });
});

describe("Wave 2 — Parallel 4+1 Orchestrator & Guardrails (lib/agents/orchestrator.ts)", () => {
  const case01 = SCENARIO_FIXTURES.find((f) => f.scenarioCode === "CASE-01")!;
  const case02 = SCENARIO_FIXTURES.find((f) => f.scenarioCode === "CASE-02")!;
  const case03 = SCENARIO_FIXTURES.find((f) => f.scenarioCode === "CASE-03")!;

  it("deterministically enforces graph_tracer node IDs & smurfing flags and strips fabricated policy citations", async () => {
    const provider = makeMockWarRoomProvider({ hallucinateGraphAndCitations: true });
    const result = await runWarRoomInvestigation({
      caseId: "unit::CASE-01",
      scenarioCode: case01.scenarioCode,
      title: case01.title,
      subtitle: case01.subtitle,
      graphData: case01.graphData,
      caseContext: case01.caseContext,
      sanitizedMinute0: null,
      provider,
    });

    // Graph tracer overrides hallucinated LLM output with deterministic lib/graph truth
    expect(result.debate.agents.graph_tracer.status).toBe("OK");
    expect(result.debate.agents.graph_tracer.smurfing_detected).toBe(true);
    expect(result.debate.agents.graph_tracer.mule_cluster_detected).toBe(true);
    expect(result.debate.agents.graph_tracer.flagged_node_ids).not.toContain("HALLUCINATED_NODE_999");
    expect(result.debate.agents.graph_tracer.flagged_node_ids).toContain("ACC_MULE_01");
    expect(result.debate.agents.graph_tracer.flagged_node_ids).toContain("DEV_ANDROID_99");

    // Compliance RAG strips fabricated chunk IDs not in retrieved vnPolicies.json chunks
    const citedIds = result.debate.agents.compliance_rag.cited_chunks.map((c) => c.chunk_id);
    expect(citedIds).not.toContain("FABRICATED-LAW-999");
    expect(citedIds.length).toBeGreaterThan(0);
    const retrievedSet = new Set(result.debate.retrieved_chunks.map((c) => c.chunk_id));
    for (const id of citedIds) {
      expect(retrievedSet.has(id)).toBe(true);
    }

    // CASE-01 has >= 2 verified independent sources -> eligible for Layer 2 ACTIVE
    expect(result.debate.synthesis.independent_sources.length).toBeGreaterThanOrEqual(2);
    expect(result.debate.synthesis.eligible_for_active_immunity).toBe(true);
  });

  it("isolates a failing agent to AGENT_DEGRADED while the other 3 agents and synthesizer still succeed (FR-05.3)", async () => {
    const provider = makeMockWarRoomProvider({ failAgent: "evidence_correlator" });
    const events: WarRoomSseEvent[] = [];

    const result = await runWarRoomInvestigation({
      caseId: "unit::CASE-01-degraded",
      scenarioCode: case01.scenarioCode,
      title: case01.title,
      subtitle: case01.subtitle,
      graphData: case01.graphData,
      caseContext: case01.caseContext,
      sanitizedMinute0: null,
      provider,
      onEvent: (evt) => events.push(evt),
    });

    expect(result.debate.agents.evidence_correlator.status).toBe("AGENT_DEGRADED");
    expect(result.debate.agents.evidence_correlator.error_message).toContain("malformed JSON");
    expect(result.debate.agents.evidence_correlator.independent_sources).toEqual([]);
    expect(result.debate.agents.graph_tracer.status).toBe("OK");
    expect(result.debate.agents.compliance_rag.status).toBe("OK");
    expect(result.debate.agents.false_positive_defender.status).toBe("OK");
    expect(result.debate.synthesis.recommendation).toBe("RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY");
    expect(events.some((e) => e.event === "agent_completed" && e.agent === "evidence_correlator" && e.status === "AGENT_DEGRADED")).toBe(true);
    expect(events.at(-1)?.event).toBe("completed");
  });

  it("overrides LLM claim of eligible_for_active_immunity=true on 1-source CASE-02 with deterministic false", async () => {
    const provider = makeMockWarRoomProvider({ forceEligibleClaim: true });

    const result = await runWarRoomInvestigation({
      caseId: "unit::CASE-02",
      scenarioCode: case02.scenarioCode,
      title: case02.title,
      subtitle: case02.subtitle,
      graphData: case02.graphData,
      caseContext: case02.caseContext,
      sanitizedMinute0: null,
      provider,
    });

    expect(result.debate.synthesis.independent_sources).toEqual(["MINUTE0_B2C_APK_SCREENSHOT"]);
    expect(result.debate.synthesis.eligible_for_active_immunity).toBe(false);
    expect(result.debate.synthesis.eligibility_reason_vi).toMatch(/1 nguồn|SOFT_WARNING/i);

    // Also verify CASE-03 yields 0 independent sources deterministically
    const case03Sources = deriveVerifiedIndependentSources(
      { scenarioCode: case03.scenarioCode, caseContext: case03.caseContext, sanitizedMinute0: null },
      { smurfing_detected: false, mule_cluster_detected: false },
    );
    expect(case03Sources).toEqual([]);
  });
});

describe("Wave 2 — /api/warroom/* Route Handlers", () => {
  it("lists seeded session-isolated cases via GET /api/warroom/cases", async () => {
    const sessionId = createSessionId("warroom-list");
    const res = await getWarRoomCases(
      new Request(`http://localhost/api/warroom/cases?session=${sessionId}`),
    );
    expect(res.status).toBe(200);
    const body = WarRoomCasesResponseSchema.parse(await res.json());
    expect(body.cases.length).toBe(3);
    expect(body.cases.map((c) => c.scenarioCode).sort()).toEqual(["CASE-01", "CASE-02", "CASE-03"]);
    expect(body.cases.every((c) => c.demoSessionId === sessionId)).toBe(true);
  });

  it("runs CASE-01 full workflow: investigate (JSON) -> PROPOSE_IMMUNITY ACTIVE -> PENDING_CHECKER (720h)", async () => {
    const sessionId = createSessionId("warroom-c01");
    setLLMProviderForTest(makeMockWarRoomProvider());

    const caseId = `${sessionId}::CASE-01`;
    const invRes = await postInvestigate(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
      }),
      { params: Promise.resolve({ caseId }) },
    );

    expect(invRes.status).toBe(200);
    const invBody = InvestigateCaseResponseSchema.parse(await invRes.json());
    expect(invBody.caseId).toBe(caseId);
    expect(invBody.status).toBe("PENDING_DECISION");
    expect(invBody.debate.synthesis.eligible_for_active_immunity).toBe(true);
    expect(invBody.debate.synthesis.independent_sources.length).toBeGreaterThanOrEqual(2);

    // Verify persistence in DB + AuditLog
    const dbCase = await prisma.investigationCase.findUnique({ where: { caseId } });
    expect(dbCase?.status).toBe("PENDING_DECISION");
    expect(dbCase?.agentDebateJson).toBeTruthy();
    expect(dbCase?.totalLatencyMs).not.toBeNull();

    const invAudit = await prisma.auditLog.findFirst({
      where: { demoSessionId: sessionId, action: "INVESTIGATION_RUN", targetId: caseId },
    });
    expect(invAudit).not.toBeNull();

    // Maker proposes ACTIVE immunity with >= 2 sources
    const decRes = await postDecision(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/decision?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Xác nhận smurfing 4x9.5M né QĐ 2345 và cụm mule dùng chung thiết bị DEV_ANDROID_99.",
          indicatorType: "BANK_ACCOUNT",
          indicatorValue: "990123456789",
          requestedLevel: "ACTIVE",
          evidenceSources: invBody.debate.synthesis.independent_sources,
        }),
      }),
      { params: Promise.resolve({ caseId }) },
    );

    expect(decRes.status).toBe(200);
    const decBody = CaseDecisionResponseSchema.parse(await decRes.json());
    expect(decBody.caseStatus).toBe("IMMUNITY_PROPOSED");
    expect(decBody.indicator?.status).toBe("PENDING_CHECKER");
    expect(decBody.indicator?.severity).toBe("HIGH_RISK");
    expect(decBody.indicator?.makerId).toBe("RISK_MAKER_HUYEN");
    expect(decBody.indicator?.ttlHours).toBe(IMMUNITY_TTL_HOURS.ACTIVE);
  });

  it("rejects CASE-02 single-source ACTIVE with HTTP 400 and allows SOFT_WARNING (72h)", async () => {
    const sessionId = createSessionId("warroom-c02");
    const caseId = `${sessionId}::CASE-02`;

    // 1 source ACTIVE -> 400 INSUFFICIENT_EVIDENCE_SOURCES (also verifies deduplication!)
    const badRes = await postDecision(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/decision?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Thử đề xuất ACTIVE chỉ với 1 nguồn APK trùng lặp.",
          indicatorType: "URL_DOMAIN",
          indicatorValue: "dichvucong-xacminh-hoso.example/capnhat.apk",
          requestedLevel: "ACTIVE",
          evidenceSources: ["MINUTE0_B2C_APK_SCREENSHOT", "MINUTE0_B2C_APK_SCREENSHOT"],
        }),
      }),
      { params: Promise.resolve({ caseId }) },
    );
    expect(badRes.status).toBe(400);
    const badJson = (await badRes.json()) as { code: string; error: string };
    expect(badJson.code).toBe("INSUFFICIENT_EVIDENCE_SOURCES");
    expect(badJson.error).toContain("SOFT_WARNING");

    // 1 source SOFT_WARNING -> 200 OK with 72h TTL
    const okRes = await postDecision(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/decision?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Phát hành Cảnh báo mềm 72h cho tên miền phát tán tệp .apk giả mạo.",
          indicatorType: "URL_DOMAIN",
          indicatorValue: "dichvucong-xacminh-hoso.example/capnhat.apk",
          requestedLevel: "SOFT_WARNING",
          evidenceSources: ["MINUTE0_B2C_APK_SCREENSHOT"],
        }),
      }),
      { params: Promise.resolve({ caseId }) },
    );
    expect(okRes.status).toBe(200);
    const okBody = CaseDecisionResponseSchema.parse(await okRes.json());
    expect(okBody.caseStatus).toBe("IMMUNITY_PROPOSED");
    expect(okBody.indicator?.status).toBe("SOFT_WARNING");
    expect(okBody.indicator?.severity).toBe("SOFT_WARNING");
    expect(okBody.indicator?.ttlHours).toBe(IMMUNITY_TTL_HOURS.SOFT_WARNING);
  });

  it("handles CASE-03 Chị Hoa False Positive: RECOMMEND_DISMISS_FP -> DISMISS_FP creates ZERO immunity rows", async () => {
    const sessionId = createSessionId("warroom-c03");
    setLLMProviderForTest(makeMockWarRoomProvider({ recommendDismissFp: true }));
    const caseId = `${sessionId}::CASE-03`;

    const invRes = await postInvestigate(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
      }),
      { params: Promise.resolve({ caseId }) },
    );
    expect(invRes.status).toBe(200);
    const invBody = InvestigateCaseResponseSchema.parse(await invRes.json());
    expect(invBody.debate.synthesis.recommendation).toBe("RECOMMEND_DISMISS_FP");
    expect(invBody.debate.agents.false_positive_defender.recommend_dismiss).toBe(true);
    expect(invBody.debate.agents.false_positive_defender.innocence_confidence).toBeGreaterThanOrEqual(80);
    expect(invBody.debate.synthesis.eligible_for_active_immunity).toBe(false);

    const decRes = await postDecision(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/decision?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "DISMISS_FP",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Tiểu thương livestream hợp lệ, 14 tháng sạch, 0 khiếu nại, đóng cảnh báo giả.",
        }),
      }),
      { params: Promise.resolve({ caseId }) },
    );
    expect(decRes.status).toBe(200);
    const decBody = CaseDecisionResponseSchema.parse(await decRes.json());
    expect(decBody.caseStatus).toBe("DISMISSED_FP");
    expect(decBody.indicator).toBeNull();

    const indicatorCount = await prisma.immunityIndicator.count({
      where: { demoSessionId: sessionId },
    });
    expect(indicatorCount).toBe(0);

    const dismissAudit = await prisma.auditLog.findFirst({
      where: { demoSessionId: sessionId, action: "CASE_DISMISSED_FP", targetId: caseId },
    });
    expect(dismissAudit).not.toBeNull();
  });

  it("enforces RBAC HTTP 403 FORBIDDEN_ROLE when non-RISK_MAKER submits a decision", async () => {
    const sessionId = createSessionId("warroom-rbac");
    const caseId = `${sessionId}::CASE-03`;

    for (const forbiddenRole of ["RISK_CHECKER", "USER_B2C", "FAMILY_GUARDIAN"] as const) {
      const res = await postDecision(
        new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/decision?session=${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: "DISMISS_FP",
            actorId: "UNAUTHORIZED_ACTOR",
            actorRole: forbiddenRole,
            rationale: "Thử vượt quyền Maker.",
          }),
        }),
        { params: Promise.resolve({ caseId }) },
      );
      expect(res.status).toBe(403);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("FORBIDDEN_ROLE");
    }
  });

  it("streams valid WarRoomSseEventSchema events when ?stream=1 is requested", async () => {
    const sessionId = createSessionId("warroom-sse");
    setLLMProviderForTest(makeMockWarRoomProvider());
    const caseId = `${sessionId}::CASE-01`;

    const res = await postInvestigate(
      new Request(
        `http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?stream=1&session=${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
        },
      ),
      { params: Promise.resolve({ caseId }) },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const rawText = await res.text();
    const dataLines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"));

    const events = dataLines.map((line) =>
      WarRoomSseEventSchema.parse(JSON.parse(line.slice(5).trim())),
    );

    const started = events.filter((e) => e.event === "agent_started");
    const completed = events.filter((e) => e.event === "agent_completed");
    const synthStarted = events.filter((e) => e.event === "synthesis_started");
    const finalEvents = events.filter((e) => e.event === "completed");

    expect(started).toHaveLength(4);
    expect(completed).toHaveLength(4);
    expect(synthStarted).toHaveLength(1);
    expect(finalEvents).toHaveLength(1);
    expect(events.at(-1)?.event).toBe("completed");

    // Verify DB already persisted by the time SSE completes
    const persisted = await prisma.investigationCase.findUnique({ where: { caseId } });
    expect(persisted?.status).toBe("PENDING_DECISION");
    expect(persisted?.agentDebateJson).toBeTruthy();
  });

  it("returns HTTP 503 LLM_NOT_CONFIGURED when LLM credentials are missing (never fakes AI)", async () => {
    const sessionId = createSessionId("warroom-503");
    setLLMProviderForTest(makeMockWarRoomProvider({ configured: false }));
    const caseId = `${sessionId}::CASE-01`;

    const jsonRes = await postInvestigate(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
      }),
      { params: Promise.resolve({ caseId }) },
    );
    expect(jsonRes.status).toBe(503);
    const jsonErr = (await jsonRes.json()) as { code: string };
    expect(jsonErr.code).toBe("LLM_NOT_CONFIGURED");

    const sseRes = await postInvestigate(
      new Request(
        `http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?stream=1&session=${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
        },
      ),
      { params: Promise.resolve({ caseId }) },
    );
    expect(sseRes.status).toBe(503);
    const sseErr = (await sseRes.json()) as { code: string };
    expect(sseErr.code).toBe("LLM_NOT_CONFIGURED");
  });

  it("returns HTTP 429 DAILY_LLM_QUOTA_EXCEEDED when daily cap is reached", async () => {
    const sessionId = createSessionId("warroom-quota");
    setLLMProviderForTest(makeMockWarRoomProvider());
    const caseId = `${sessionId}::CASE-01`;

    const dateKey = getVietnamDateKey();
    await prisma.dailyLlmUsage.upsert({
      where: { dateKey },
      create: { dateKey, callCount: 1000 },
      update: { callCount: 1000 },
    });

    const res = await postInvestigate(
      new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/investigate?session=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }),
      }),
      { params: Promise.resolve({ caseId }) },
    );

    expect(res.status).toBe(429);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("DAILY_LLM_QUOTA_EXCEEDED");
  });
});
