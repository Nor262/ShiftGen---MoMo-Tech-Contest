import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ApproveImmunityResponseSchema,
  CaseDecisionResponseSchema,
  CreateAppealResponseSchema,
  DebateSynthesisSchema,
  DEMO_SIMULATION_LABEL,
  DemoResetResponseSchema,
  ExpireDemoResponseSchema,
  FamilyEscalateResponseSchema,
  FamilyHoldsResponseSchema,
  ImmunityListResponseSchema,
  InvestigateCaseResponseSchema,
  NEUTRAL_HOLD_MESSAGE,
  ReportCyberResponseSchema,
  ResolveAppealResponseSchema,
  ScanResultSchema,
  SessionResponseSchema,
  ShieldScanResponseSchema,
  TransferResponseSchema,
  WarRoomDebateSchema,
  WarRoomSseEventSchema,
  type ScanResult,
  type WarRoomSseEvent,
} from "@/contracts";
import { SCENARIO_FIXTURES } from "@/data/scenarios";
import { retrievePolicyChunks } from "@/lib/agents";
import { analyzeCaseGraph } from "@/lib/graph";
import {
  createBedrockAdapter,
  createGeminiAdapter,
  createOpenAIAdapter,
  createResilientProvider,
  getLLMProvider,
  LLMNotConfiguredError,
  LLMTimeoutError,
  setLLMProviderForTest,
  type LLMProvider,
  type LLMRawAdapter,
} from "@/lib/llm";
import {
  BALANCE_TOKEN,
  CCCD_TOKEN,
  PHONE_TOKEN,
  redactScanResult,
  redactText,
  SPENDING_TOKEN,
} from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import {
  ensureSessionSeeded,
  getVietnamDateKey,
  lookupActiveImmunity,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
} from "@/lib/session";
import { POST as postDemoReset } from "@/app/api/demo/reset/route";
import { GET as getImmunity } from "@/app/api/immunity/route";
import { POST as postAppeal } from "@/app/api/immunity/[id]/appeal/route";
import { POST as postApprove } from "@/app/api/immunity/[id]/approve/route";
import { POST as postExpireDemo } from "@/app/api/immunity/[id]/expire-demo/route";
import { POST as postResolveAppeal } from "@/app/api/immunity/[id]/resolve-appeal/route";
import { GET as getSession } from "@/app/api/session/route";
import { POST as postConsent } from "@/app/api/shield/consent/route";
import { POST as postFamilyEscalate } from "@/app/api/shield/family/escalate/[txId]/route";
import { GET as getFamilyHolds } from "@/app/api/shield/family/holds/route";
import { POST as postReportCyber } from "@/app/api/shield/report-cyber/route";
import { postScanWithConsent as postScan } from "./helpers/scan-with-consent";
import { POST as postTransfer } from "@/app/api/shield/transfer/route";
import { POST as postDecision } from "@/app/api/warroom/cases/[caseId]/decision/route";
import { POST as postInvestigate } from "@/app/api/warroom/cases/[caseId]/investigate/route";

const TEST_SESSIONS: string[] = [];
const TEST_RATE_LIMIT_KEYS: string[] = [];

function createSessionId(prefix: string): string {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  TEST_SESSIONS.push(id);
  return id;
}

function makeRequest(
  path: string,
  sessionId: string,
  options?: {
    method?: string;
    body?: unknown;
    useCookieOnly?: boolean;
    ip?: string;
    accept?: string;
  },
): Request {
  const headers = new Headers();
  if (options?.useCookieOnly) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`);
  } else {
    headers.set(SESSION_HEADER_NAME, sessionId);
  }
  if (options?.ip) {
    headers.set("x-forwarded-for", options.ip);
  }
  if (options?.accept) {
    headers.set("accept", options.accept);
  }
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(`http://localhost:3000${path}`, {
    method: options?.method ?? (options?.body !== undefined ? "POST" : "GET"),
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function makeQaLlmProvider(options?: {
  mode?: "CASE-01" | "CASE-02" | "CASE-03" | "BENIGN" | "PII_STRESS";
  capturedUserPrompts?: string[];
  failAgent?: "compliance_rag" | "false_positive_defender";
  slowAgent?: "compliance_rag";
  slowDelayMs?: number;
  modelUsed?: string;
}): LLMProvider {
  const modelUsed = options?.modelUsed ?? "gemini-2.5-flash-qa-mock";

  const makeScanOutput = (): ScanResult => {
    if (options?.mode === "CASE-02") {
      return ScanResultSchema.parse({
        status: "ANALYZED",
        risk_score: 94,
        risk_level: "CRITICAL",
        scam_category: "APK_MALWARE_BAIT",
        visual_tampering_flags: ["Tin nhắn dụ cài bản cập nhật VNeID giả đính kèm file .apk"],
        psych_manipulation_cues: [
          {
            type: "APK_PHISHING_BAIT",
            quote_vi: "Tải capnhat.apk để xác nhận đơn hàng và bật Trợ năng (Accessibility).",
            explanation_vi: "Dụ cài ứng dụng ngoài CH Play để chiếm quyền điều khiển thiết bị.",
          },
        ],
        cyber_threat_flags: [
          {
            type: "APK_ACCESSIBILITY_BAIT",
            indicator: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
            severity: "CRITICAL",
            detail_vi: "File .apk yêu cầu quyền Accessibility Services trái phép (TT 77/2025).",
          },
        ],
        extracted_entities: {
          recipient_account: null,
          recipient_bank: null,
          urls: ["https://dichvucong-xacminh-hoso.example/capnhat.apk"],
          domains: ["dichvucong-xacminh-hoso.example"],
          amount_vnd: null,
          apk_filenames: ["capnhat.apk"],
        },
        calm_guidance_vi:
          "Tuyệt đối không tải tệp .apk ngoài kho ứng dụng chính thức và không bật quyền Trợ năng (Accessibility).",
        deescalation_questions_vi: [
          "Đơn vị vận chuyển thật có bao giờ yêu cầu cài file .apk để nhận hàng không?",
          "Bạn có thể kiểm tra mã vận đơn trực tiếp trên ứng dụng chính thức không?",
        ],
      });
    }

    if (options?.mode === "BENIGN") {
      return ScanResultSchema.parse({
        status: "ANALYZED",
        risk_score: 10,
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
        calm_guidance_vi: "Không ghi nhận dấu hiệu bất thường trong nội dung kiểm tra.",
        deescalation_questions_vi: ["Bạn đã đối chiếu đúng tên người nhận trước khi chuyển chưa?"],
      });
    }

    if (options?.mode === "PII_STRESS") {
      return ScanResultSchema.parse({
        status: "ANALYZED",
        risk_score: 90,
        risk_level: "CRITICAL",
        scam_category: "POLICE_IMPERSONATION",
        visual_tampering_flags: [
          "Lệnh giả mạo ghi CCCD 079062001234 và CCCD: 079088009911",
        ],
        psych_manipulation_cues: [
          {
            type: "FEAR_THREAT",
            quote_vi:
              "Gọi 0912.345.678 hoặc +84987654321, kiểm tra số dư 145.000.000đ và lịch sử chi tiêu: mua sắm 3.500.000đ",
            explanation_vi:
              "Đe dọa phong tỏa ví hiện có: 52.500.000 vnđ nếu không chuyển về STK 990123456789.",
          },
        ],
        cyber_threat_flags: [
          {
            type: "APK_ACCESSIBILITY_BAIT",
            indicator: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
            severity: "CRITICAL",
            detail_vi: "Link tải tệp .apk giả mạo kèm hướng dẫn gọi 0987 654 321.",
          },
        ],
        extracted_entities: {
          recipient_account: "990123456789",
          recipient_bank: "NGAN_HANG_MO_PHONG_X",
          urls: ["https://dichvucong-xacminh-hoso.example/capnhat.apk"],
          domains: ["dichvucong-xacminh-hoso.example"],
          amount_vnd: 9_500_000,
          apk_filenames: ["capnhat.apk"],
        },
        calm_guidance_vi:
          "Bác bình tĩnh, không chuyển vào STK 990123456789, không gọi 0912345678, giữ an toàn số dư 145.000.000đ và CCCD 079062001234.",
        deescalation_questions_vi: [
          "Người gọi qua số 0987 654 321 có yêu cầu giữ bí mật với gia đình không?",
        ],
      });
    }

    // Default: CASE-01 Bác Hùng
    return ScanResultSchema.parse({
      status: "ANALYZED",
      risk_score: 92,
      risk_level: "CRITICAL",
      scam_category: "POLICE_IMPERSONATION",
      visual_tampering_flags: ["Ảnh lệnh bắt giả ghép dấu đỏ bất thường (MẪU MÔ PHỎNG)"],
      psych_manipulation_cues: [
        {
          type: "FEAR_THREAT",
          quote_vi: "Lệnh tạm giữ điều tra nếu không chuyển 9.500.000đ để chứng minh vô tội.",
          explanation_vi: "Gây hoảng sợ để nạn nhân chuyển tiền gấp nhiều lần dưới 10 triệu.",
        },
        {
          type: "SECRECY_ISOLATION",
          quote_vi: "Tuyệt đối không báo cho con cái hay người thân.",
          explanation_vi: "Cô lập nạn nhân khỏi sự kiểm chứng của gia đình.",
        },
      ],
      cyber_threat_flags: [],
      extracted_entities: {
        recipient_account: "990123456789",
        recipient_bank: "NGAN_HANG_MO_PHONG_X",
        urls: [],
        domains: [],
        amount_vnd: 9_500_000,
        apk_filenames: [],
      },
      calm_guidance_vi:
        "Bác hãy hít thở sâu và dừng thao tác chuyển tiền vào STK 990123456789. Hãy gọi kiểm chứng trực tiếp với con gái trước khi quyết định.",
      deescalation_questions_vi: [
        "Người này có yêu cầu bác giữ bí mật với gia đình và chuyển từng khoản 9,5 triệu không?",
        "Bác đã gọi cho Chị Minh để xác minh lại thông tin chưa?",
      ],
    });
  };

  return {
    backend: "gemini",
    visionModel: modelUsed,
    reasoningModel: modelUsed,
    isConfigured: () => true,
    analyzeImage: (async (
      input: { userPrompt: string },
      schema?: z.ZodType<unknown>,
    ) => {
      options?.capturedUserPrompts?.push(input.userPrompt);
      const scan = makeScanOutput();
      return {
        data: schema ? schema.parse(scan) : scan,
        modelUsed,
        backend: "gemini" as const,
        measuredLatencyMs: 6,
        repaired: false,
        usedFallback: false,
      };
    }) as LLMProvider["analyzeImage"],
    generateJSON: async <T>(
      schema: z.ZodType<T, z.ZodTypeDef, unknown>,
      input: { systemPrompt: string; userPrompt: string },
    ) => {
      options?.capturedUserPrompts?.push(input.userPrompt);
      const sys = input.systemPrompt;

      if (sys.includes("Graph & Smurfing Tracer Agent")) {
        return {
          data: schema.parse({
            flagged_node_ids: [],
            smurfing_detected: false,
            mule_cluster_detected: false,
            key_findings: [
              options?.mode === "CASE-03"
                ? "35 giao dịch nhỏ 150k–450k từ 35 khách mua khác nhau trong khung giờ livestream 20h–21h."
                : "Phát hiện mô thức chia nhỏ 4×9,5M né ngưỡng QĐ 2345 và cụm ví mule chung thiết bị/IP.",
            ],
            risk_contribution: options?.mode === "CASE-03" ? 10 : 90,
          }),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 5,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("Pre-App Evidence Correlator Agent")) {
        return {
          data: schema.parse({
            minute0_matched: options?.mode !== "CASE-03",
            simo_flag_matched: options?.mode === "CASE-01",
            cyber_indicator_matched: options?.mode === "CASE-02",
            independent_sources: [],
            key_findings: [
              options?.mode === "CASE-03"
                ? "Không có bằng chứng Phút 00, không có cờ SIMO hay chỉ báo mã độc."
                : "Đã đối chiếu bằng chứng Phút 00 đã ẩn PII với tín hiệu giao dịch nội bộ.",
            ],
            risk_contribution: options?.mode === "CASE-03" ? 5 : 85,
          }),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 5,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("Compliance & Policy RAG Agent")) {
        if (options?.failAgent === "compliance_rag") {
          throw new Error("Simulated compliance_rag schema failure");
        }
        if (options?.slowAgent === "compliance_rag") {
          await new Promise((resolve) => setTimeout(resolve, options.slowDelayMs ?? 150));
        }
        return {
          data: schema.parse({
            cited_chunk_ids: ["PCRT29-01", "TT53-01", "TT77-01", "LAW134-01"],
            policy_notes_vi: [
              "Áp dụng giải trình 2 chiều và rà soát khiếu nại bởi con người theo TT 53/2026/TT-NHNN.",
              "Tôn trọng Điều 4 Luật AI 134/2025: không tự động khóa vĩnh viễn thiếu phê duyệt.",
            ],
            insurance_eligibility_vi:
              "Bảo hiểm An toàn chuyển tiền MoMo áp dụng mức ≤ 2 triệu đồng và có điều khoản loại trừ.",
            human_review_required: true,
          }),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 5,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("False-Positive Defender Agent")) {
        if (options?.failAgent === "false_positive_defender") {
          throw new Error("Simulated false_positive_defender failure");
        }
        const isCase03 = options?.mode === "CASE-03";
        return {
          data: schema.parse({
            innocence_confidence: isCase03 ? 91 : 12,
            benign_signals: isCase03
              ? [
                  "14 tháng lịch sử kinh doanh sạch, 0 khiếu nại.",
                  "35 giao dịch từ 35 thiết bị/IP người mua độc lập.",
                ]
              : [],
            counter_arguments_vi: isCase03
              ? [
                  "Đây là dòng tiền bán hàng livestream hợp pháp, không phải smurfing.",
                  "Chặn nhầm sẽ ảnh hưởng sinh kế tiểu thương và vi phạm nguyên tắc bảo vệ người dùng.",
                ]
              : ["Chứng cứ rủi ro áp đảo lập luận vô tội."],
            recommend_dismiss: isCase03,
          }),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 5,
          repaired: false,
          usedFallback: false,
        };
      }

      if (sys.includes("Debate Synthesizer")) {
        const isCase03 = options?.mode === "CASE-03";
        const isCase02 = options?.mode === "CASE-02";
        return {
          data: schema.parse({
            recommendation: isCase03
              ? "RECOMMEND_DISMISS_FP"
              : "RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY",
            eligible_for_active_immunity: !isCase03 && !isCase02,
            eligibility_reason_vi: isCase03
              ? "Không có bằng chứng gian lận độc lập; khuyến nghị đóng cảnh báo giả."
              : isCase02
                ? "Mới có 1 nguồn độc lập nên chỉ đủ điều kiện SOFT_WARNING 72h."
                : "Đủ ≥ 2 nguồn độc lập (Phút 00 + Đồ thị Smurfing/Mule + SIMO), đủ điều kiện trình Checker duyệt ACTIVE.",
            independent_sources: [],
            risk_summary_points: isCase03
              ? ["35 giao dịch nhỏ phát sinh trong 1 giờ tối."]
              : ["Cảnh báo Phút 00 khớp với phân tích B2E."],
            defense_summary_points: isCase03
              ? ["14 tháng sạch, 0 khiếu nại, thiết bị/IP người mua phân tán."]
              : ["Đã kiểm tra khả năng giao dịch hợp pháp trước khi đề xuất."],
            cskh_empathetic_card: {
              customer_anxiety_level: isCase03 ? "LOW" : "HIGH",
              funds_status_vi: isCase03
                ? "Tài khoản kinh doanh hoạt động bình thường."
                : "Khoản tiền đang được bảo vệ an toàn ở trạng thái tạm giữ.",
              empathetic_openers_vi: [
                "Chào anh/chị, MoMo rất hiểu sự lo lắng của gia đình mình lúc này và luôn ưu tiên bảo vệ an toàn số tiền của mình.",
                "Mọi quyết định kiểm tra đều có chuyên viên thật đồng hành và giải thích rõ ràng từng bước.",
              ],
              do_not_say_vi: [
                "Tuyệt đối không mạo danh NHNN hoặc cơ quan Công an.",
                "Không đổ lỗi cho khách hàng.",
              ],
            },
          }),
          modelUsed,
          backend: "gemini",
          measuredLatencyMs: 6,
          repaired: false,
          usedFallback: false,
        };
      }

      // Shield TEXT_LOOKUP fallback
      const scan = makeScanOutput();
      return {
        data: schema.parse(scan),
        modelUsed,
        backend: "gemini",
        measuredLatencyMs: 5,
        repaired: false,
        usedFallback: false,
      };
    },
  };
}

function clearAllLlmCredentialsInTest() {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("LLM_API_KEY", "");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
  vi.stubEnv("LLM_FALLBACK_BACKEND", "");
}

afterEach(() => {
  setLLMProviderForTest(null);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
  if (TEST_RATE_LIMIT_KEYS.length > 0) {
    await prisma.rateLimitCounter.deleteMany({
      where: { key: { in: TEST_RATE_LIMIT_KEYS } },
    });
  }
});

describe("Wave 4 QA — 1. Bidirectional Free-Text & LLM-Output PII Redaction Stress", () => {
  it("redacts CCCD, VN phones, and balances on BOTH LLM input & output while keeping suspect account/URL and leaking zero PII to Family holds", async () => {
    const sessionId = createSessionId("w4-pii");
    const capturedUserPrompts: string[] = [];
    setLLMProviderForTest(
      makeQaLlmProvider({ mode: "PII_STRESS", capturedUserPrompts }),
    );

    const consentRes = await postConsent(
      makeRequest("/api/shield/consent", sessionId, {
        body: {
          userId: "USER_B2C_HUNG",
          optIn24hHold: true,
          guardianId: "FAMILY_MINH",
        },
      }),
    );
    expect(consentRes.status).toBe(200);

    // Note: labeled `+84 912.345.678` is matched by LABELED_PHONE_REGEX; unlabeled `+84987654321`, `0912.345.678`, `0987 654 321` are matched by PHONE_REGEX.
    const freeText = [
      "CCCD 079062001234 và CCCD: 079088009911.",
      "SĐT: +84 912.345.678, số khác 0912.345.678 và 0987 654 321 và +84987654321.",
      "số dư 145.000.000đ, ví hiện có: 52.500.000 vnđ, lịch sử chi tiêu: trả tiền điện 1.200.000đ.",
      "Yêu cầu chuyển vào STK 990123456789 và tải https://dichvucong-xacminh-hoso.example/capnhat.apk",
    ].join(" ");

    const scanRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_HUNG",
          inputType: "TEXT_LOOKUP",
          lookupText: freeText,
          recipientAccount: "990123456789",
          url: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
        },
      }),
    );
    expect(scanRes.status).toBe(200);
    const scanData = ShieldScanResponseSchema.parse(await scanRes.json());

    // Verify LLM input prompt was redacted & wrapped in <untrusted_user_content>.
    expect(capturedUserPrompts).toHaveLength(1);
    const sentPrompt = capturedUserPrompts[0];
    expect(sentPrompt).toContain("<untrusted_user_content>");
    expect(sentPrompt).toContain("</untrusted_user_content>");
    expect(sentPrompt).not.toContain("079062001234");
    expect(sentPrompt).not.toContain("079088009911");
    expect(sentPrompt).not.toContain("0912.345.678");
    expect(sentPrompt).not.toContain("0987 654 321");
    expect(sentPrompt).not.toContain("+84987654321");
    expect(sentPrompt).not.toContain("145.000.000đ");
    expect(sentPrompt).not.toContain("52.500.000 vnđ");
    expect(sentPrompt).toContain("990123456789");
    expect(sentPrompt).toContain("https://dichvucong-xacminh-hoso.example/capnhat.apk");

    // Verify LLM output fields are ALSO redacted while suspect entities stay intact.
    const serializedResult = JSON.stringify({
      calm_guidance_vi: scanData.result.calm_guidance_vi,
      psych_manipulation_cues: scanData.result.psych_manipulation_cues,
      visual_tampering_flags: scanData.result.visual_tampering_flags,
      cyber_threat_flags: scanData.result.cyber_threat_flags,
    });
    expect(serializedResult).not.toContain("079062001234");
    expect(serializedResult).not.toContain("079088009911");
    expect(serializedResult).not.toContain("0912345678");
    expect(serializedResult).not.toContain("0912.345.678");
    expect(serializedResult).not.toContain("0987 654 321");
    expect(serializedResult).not.toContain("+84987654321");
    expect(serializedResult).not.toContain("145.000.000đ");
    expect(serializedResult).not.toContain("52.500.000 vnđ");
    expect(serializedResult).not.toContain("mua sắm 3.500.000đ");
    expect(scanData.result.calm_guidance_vi).toContain(CCCD_TOKEN);
    expect(scanData.result.calm_guidance_vi).toContain(PHONE_TOKEN);
    expect(scanData.result.calm_guidance_vi).toContain(BALANCE_TOKEN);
    expect(scanData.result.psych_manipulation_cues[0]?.explanation_vi).toContain(BALANCE_TOKEN);
    expect(scanData.result.visual_tampering_flags[0]).toContain(CCCD_TOKEN);
    expect(scanData.result.extracted_entities.recipient_account).toBe("990123456789");
    expect(scanData.result.extracted_entities.urls).toContain(
      "https://dichvucong-xacminh-hoso.example/capnhat.apk",
    );
    expect(scanData.sanitizedEvidence.contains_raw_image).toBe(false);
    expect(scanData.piiDiff.total_redacted).toBeGreaterThanOrEqual(4);
    expect(SPENDING_TOKEN).toBe("[LỊCH_SỬ_CHI_TIÊU_ĐÃ_ẨN]");

    // Transfer enters ON_HOLD_24H and Family Co-Sign holds leaks ZERO PII.
    const txRes = await postTransfer(
      makeRequest("/api/shield/transfer", sessionId, {
        body: {
          userId: "USER_B2C_HUNG",
          senderLabel: "Bác Hùng (62 tuổi)",
          scanId: scanData.scanId,
          recipientAccount: "990123456789",
          recipientBank: "NGAN_HANG_MO_PHONG_X",
          amountVnd: 9_500_000,
        },
      }),
    );
    expect(txRes.status).toBe(200);
    const txData = TransferResponseSchema.parse(await txRes.json());
    expect(txData.status).toBe("ON_HOLD_24H");

    const holdsRes = await getFamilyHolds(makeRequest("/api/shield/family/holds", sessionId));
    expect(holdsRes.status).toBe(200);
    const holdsData = FamilyHoldsResponseSchema.parse(await holdsRes.json());
    expect(holdsData.holds.length).toBeGreaterThanOrEqual(1);
    const serializedHolds = JSON.stringify(holdsData);
    for (const secret of [
      "079062001234",
      "079088009911",
      "0912345678",
      "0912.345.678",
      "0987 654 321",
      "84987654321",
      "145.000.000",
      "52.500.000",
      "trả tiền điện",
      "mua sắm 3.500.000",
    ]) {
      expect(serializedHolds).not.toContain(secret);
    }
  });
});

describe("Wave 4 QA — 2. LLM Adapters (Gemini/OpenAI/Bedrock), Failover, 503 & 4-Agent Schemas", () => {
  it("verifies Gemini REST adapter payload, header, inline image, and JSON extraction", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    vi.stubEnv("GEMINI_VISION_MODEL", "gemini-2.5-flash");

    const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      expect(init?.headers).toMatchObject({
        "Content-Type": "application/json",
        "x-goog-api-key": "test-gemini-key",
      });
      expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json" });
      const contents = body.contents as Array<{ parts: Array<Record<string, unknown>> }>;
      expect(contents[0]?.parts[0]).toMatchObject({
        inlineData: { mimeType: "image/png", data: "AQID" },
      });

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"ok":true,"risk":88}\n```' }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResilientProvider(createGeminiAdapter());
    const res = await provider.analyzeImage(
      {
        systemPrompt: "sys",
        userPrompt: "usr",
        imageBase64: "AQID",
        imageMimeType: "image/png",
      },
      z.object({ ok: z.boolean(), risk: z.number() }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(res.backend).toBe("gemini");
    expect(res.data).toEqual({ ok: true, risk: 88 });
  });

  it("verifies OpenAI-compatible REST adapter payload, auth header, multimodal image_url, and JSON extraction", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("LLM_BASE_URL", "https://custom-llm.example/v1/");
    vi.stubEnv("LLM_VISION_MODEL", "gpt-4o-mini-qa");

    const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://custom-llm.example/v1/chat/completions");
      expect(init?.headers).toMatchObject({
        "Content-Type": "application/json",
        Authorization: "Bearer test-openai-key",
      });
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        model: string;
        response_format: { type: string };
        messages: Array<{ role: string; content: unknown }>;
      };
      expect(body.model).toBe("gpt-4o-mini-qa");
      expect(body.response_format).toEqual({ type: "json_object" });
      expect(Array.isArray(body.messages[1]?.content)).toBe(true);

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Kết quả: {"status":"OK","score":77}' } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createResilientProvider(createOpenAIAdapter());
    const res = await provider.analyzeImage(
      {
        systemPrompt: "sys",
        userPrompt: "usr",
        imageBase64: "AQID",
        imageMimeType: "image/jpeg",
      },
      z.object({ status: z.string(), score: z.number() }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.backend).toBe("openai");
    expect(res.data).toEqual({ status: "OK", score: 77 });
  });

  it("verifies AWS Bedrock Converse adapter payload, image bytes, guardrailConfig, and JSON extraction", async () => {
    vi.stubEnv("AWS_ACCESS_KEY_ID", "AKIATESTKEY");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret-test-key");
    vi.stubEnv("BEDROCK_REGION", "ap-southeast-2");
    vi.stubEnv("BEDROCK_VISION_MODEL", "apac.amazon.nova-pro-v1:0");
    vi.stubEnv("BEDROCK_GUARDRAIL_ID", "gr-qa-01");
    vi.stubEnv("BEDROCK_GUARDRAIL_VERSION", "1");

    const sendSpy = vi
      .spyOn(BedrockRuntimeClient.prototype, "send")
      .mockImplementation((async (cmd: unknown) => {
        expect(cmd).toBeInstanceOf(ConverseCommand);
        const input = (cmd as ConverseCommand).input;
        expect(input.modelId).toBe("apac.amazon.nova-pro-v1:0");
        expect(input.guardrailConfig).toEqual({
          guardrailIdentifier: "gr-qa-01",
          guardrailVersion: "1",
        });
        const firstContent = input.messages?.[0]?.content?.[0];
        expect(firstContent).toHaveProperty("image.format", "webp");
        return {
          output: {
            message: {
              content: [{ text: '{"verdict":"SAFE","confidence":95}' }],
            },
          },
        };
      }) as never);

    const provider = createResilientProvider(createBedrockAdapter());
    const res = await provider.analyzeImage(
      {
        systemPrompt: "sys",
        userPrompt: "usr",
        imageBase64: "AQID",
        imageMimeType: "image/webp",
      },
      z.object({ verdict: z.string(), confidence: z.number() }),
    );

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(res.backend).toBe("bedrock");
    expect(res.data).toEqual({ verdict: "SAFE", confidence: 95 });
  });

  it("verifies LLM_FALLBACK_BACKEND failover, timeout mapping (LLMTimeoutError), and 503 LLM_NOT_CONFIGURED", async () => {
    // 1. Timeout handling
    const slowAdapter: LLMRawAdapter = {
      backend: "gemini",
      visionModel: "gemini-slow",
      reasoningModel: "gemini-slow",
      isConfigured: () => true,
      callRaw: async () => {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "TimeoutError";
        throw err;
      },
    };
    await expect(
      createResilientProvider(slowAdapter).generateJSON(z.object({ a: z.number() }), {
        systemPrompt: "s",
        userPrompt: "u",
        timeoutMs: 50,
      }),
    ).rejects.toBeInstanceOf(LLMTimeoutError);

    // 2. LLM_FALLBACK_BACKEND failover (gemini -> openai)
    vi.stubEnv("LLM_BACKEND", "gemini");
    vi.stubEnv("LLM_FALLBACK_BACKEND", "openai");
    vi.stubEnv("GEMINI_API_KEY", "test-gem");
    vi.stubEnv("OPENAI_API_KEY", "test-oai");

    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response("upstream error", { status: 500 });
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"recovered":true}' } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const failoverRes = await getLLMProvider().generateJSON(
      z.object({ recovered: z.boolean() }),
      { systemPrompt: "s", userPrompt: "u" },
    );
    expect(failoverRes.usedFallback).toBe(true);
    expect(failoverRes.backend).toBe("openai");
    expect(failoverRes.data).toEqual({ recovered: true });

    // 3. 503 LLM_NOT_CONFIGURED when all credentials absent
    clearAllLlmCredentialsInTest();
    const sessionId = createSessionId("w4-503");
    await ensureSessionSeeded(sessionId);

    const scan503 = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: { inputType: "TEXT_LOOKUP", lookupText: "Kiểm tra không có API key" },
      }),
    );
    expect(scan503.status).toBe(503);
    expect((await scan503.json()).code).toBe("LLM_NOT_CONFIGURED");

    const inv503 = await postInvestigate(
      makeRequest(`/api/warroom/cases/${sessionId}::CASE-01/investigate`, sessionId, {
        body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
      }),
      { params: Promise.resolve({ caseId: `${sessionId}::CASE-01` }) },
    );
    expect(inv503.status).toBe(503);
    expect((await inv503.json()).code).toBe("LLM_NOT_CONFIGURED");
  });

  it("validates WarRoomSseEventSchema & WarRoomDebateSchema across 4 agents + Synthesizer with AGENT_DEGRADED isolation", async () => {
    const sessionId = createSessionId("w4-sse");
    await ensureSessionSeeded(sessionId);
    setLLMProviderForTest(
      makeQaLlmProvider({ mode: "CASE-01", failAgent: "compliance_rag" }),
    );

    const sseRes = await postInvestigate(
      makeRequest(`/api/warroom/cases/${sessionId}::CASE-01/investigate?stream=1`, sessionId, {
        body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
        accept: "text/event-stream",
      }),
      { params: Promise.resolve({ caseId: `${sessionId}::CASE-01` }) },
    );

    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get("content-type")).toContain("text/event-stream");

    const rawText = await sseRes.text();
    const events: WarRoomSseEvent[] = rawText
      .split("\n\n")
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.startsWith("data:"))
      .map((chunk) =>
        WarRoomSseEventSchema.parse(JSON.parse(chunk.replace(/^data:\s*/, ""))),
      );

    const started = events.filter((e) => e.event === "agent_started");
    const completed = events.filter((e) => e.event === "agent_completed");
    const finalCompleted = events.find((e) => e.event === "completed");

    expect(started).toHaveLength(4);
    expect(completed).toHaveLength(4);
    expect(finalCompleted?.event).toBe("completed");

    if (finalCompleted?.event === "completed") {
      const debate = WarRoomDebateSchema.parse(finalCompleted.debate);
      expect(debate.agents.compliance_rag.status).toBe("AGENT_DEGRADED");
      expect(debate.agents.graph_tracer.status).toBe("OK");
      expect(debate.agents.evidence_correlator.status).toBe("OK");
      expect(debate.agents.false_positive_defender.status).toBe("OK");
      expect(debate.synthesis.eligible_for_active_immunity).toBe(true);
    }
  });
});

describe("Wave 4 QA — 3. Full E2E Closed-Loop Acceptance Matrix (E2E-01, E2E-02, E2E-03)", () => {
  it("E2E-01 (Bác Hùng): Consent -> Scan real PNG -> Neutral Hold -> Family Co-Sign (no PII) -> B2E 4 Agents -> Maker 403 -> Checker ACTIVE -> B2C Tier-1 Hit -> TT53 Appeal Rollback -> Warning Gone -> Audit Chain", async () => {
    const sessionId = createSessionId("w4-e2e01");

    // 1. Initial session default opt_in_24h_hold === false
    const initRes = await getSession(makeRequest("/api/session", sessionId));
    expect(initRes.status).toBe(200);
    const initData = SessionResponseSchema.parse(await initRes.json());
    expect(initData.consents.find((c) => c.userId === "USER_B2C_HUNG")?.optIn24hHold).toBe(false);

    // 2. Opt-in consent
    const consentRes = await postConsent(
      makeRequest("/api/shield/consent", sessionId, {
        body: { userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" },
      }),
    );
    expect(consentRes.status).toBe(200);

    // 3. Scan CASE-01 real PNG (public/demo-images/zalo-fake-police.png)
    setLLMProviderForTest(makeQaLlmProvider({ mode: "CASE-01" }));
    const scanRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: { userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" },
      }),
    );
    expect(scanRes.status).toBe(200);
    const scanData = ShieldScanResponseSchema.parse(await scanRes.json());
    expect(scanData.result.risk_score).toBeGreaterThanOrEqual(75);
    expect(scanData.sanitizedEvidence.contains_raw_image).toBe(false);

    // 4. Transfer 9.5M -> ON_HOLD_24H with EXACT NEUTRAL_HOLD_MESSAGE & zero authority impersonation
    const txRes = await postTransfer(
      makeRequest("/api/shield/transfer", sessionId, {
        body: {
          userId: "USER_B2C_HUNG",
          senderLabel: "Bác Hùng (62 tuổi)",
          scanId: scanData.scanId,
          recipientAccount: "990123456789",
          recipientBank: "NGAN_HANG_MO_PHONG_X",
          amountVnd: 9_500_000,
        },
      }),
    );
    expect(txRes.status).toBe(200);
    const txData = TransferResponseSchema.parse(await txRes.json());
    expect(txData.status).toBe("ON_HOLD_24H");
    expect(txData.neutralMessage).toBe(NEUTRAL_HOLD_MESSAGE);
    expect(txData.neutralMessage).not.toMatch(/NHNN|Ngân hàng Nhà nước|Công an/i);
    expect(txData.transaction.neutralMessage).toBe(NEUTRAL_HOLD_MESSAGE);

    // 5. Family Co-Sign holds check (zero CCCD/phone/balance/spending)
    const holdsRes = await getFamilyHolds(makeRequest("/api/shield/family/holds", sessionId));
    expect(holdsRes.status).toBe(200);
    const holdsData = FamilyHoldsResponseSchema.parse(await holdsRes.json());
    const hold = holdsData.holds.find((h) => h.txId === txData.txId);
    expect(hold).toBeDefined();
    expect(JSON.stringify(hold)).not.toMatch(/cccd|số dư|lịch sử chi tiêu/i);

    // 6. Family escalate to B2E
    const escRes = await postFamilyEscalate(
      makeRequest(`/api/shield/family/escalate/${txData.txId}`, sessionId, {
        body: { guardianId: "FAMILY_MINH", note: "Chuyển phòng rủi ro xác minh giúp bác." },
      }),
      { params: Promise.resolve({ txId: txData.txId }) },
    );
    expect(escRes.status).toBe(200);
    const escData = FamilyEscalateResponseSchema.parse(await escRes.json());
    expect(escData.status).toBe("ESCALATED_TO_B2E");
    expect(escData.caseRecord.sanitizedMinute0?.contains_raw_image).toBe(false);

    // 7. War-Room 4 Agents on CASE-01
    const invRes = await postInvestigate(
      makeRequest(`/api/warroom/cases/${escData.caseId}/investigate`, sessionId, {
        body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
      }),
      { params: Promise.resolve({ caseId: escData.caseId }) },
    );
    expect(invRes.status).toBe(200);
    const invData = InvestigateCaseResponseSchema.parse(await invRes.json());
    expect(invData.debate.agents.graph_tracer.smurfing_detected).toBe(true);
    expect(invData.debate.agents.graph_tracer.mule_cluster_detected).toBe(true);
    expect(invData.debate.agents.graph_tracer.flagged_node_ids).toEqual(
      expect.arrayContaining(["ACC_MULE_01", "ACC_MULE_02", "ACC_MULE_03", "DEV_ANDROID_99"]),
    );
    expect(invData.debate.synthesis.eligible_for_active_immunity).toBe(true);

    // 8. Maker proposes ACTIVE (>=2 sources) -> PENDING_CHECKER
    const proposeRes = await postDecision(
      makeRequest(`/api/warroom/cases/${escData.caseId}/decision`, sessionId, {
        body: {
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Đủ 3 nguồn độc lập: Phút 00, Smurfing/Mule Graph, SIMO.",
          indicatorType: "BANK_ACCOUNT",
          indicatorValue: "990123456789",
          requestedLevel: "ACTIVE",
          evidenceSources: invData.debate.synthesis.independent_sources,
        },
      }),
      { params: Promise.resolve({ caseId: escData.caseId }) },
    );
    expect(proposeRes.status).toBe(200);
    const proposeData = CaseDecisionResponseSchema.parse(await proposeRes.json());
    const indicatorId = proposeData.indicator!.indicatorId;
    expect(proposeData.indicator?.status).toBe("PENDING_CHECKER");

    // 9. Maker self-approve blocked 403
    const selfApproveRes = await postApprove(
      makeRequest(`/api/immunity/${indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_MAKER_HUYEN",
          checkerRole: "RISK_MAKER",
          rationale: "Thử tự phê duyệt",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: indicatorId }) },
    );
    expect(selfApproveRes.status).toBe(403);

    // 10. Checker approves ACTIVE (720h)
    const approveRes = await postApprove(
      makeRequest(`/api/immunity/${indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Xác nhận ≥2 nguồn độc lập hợp lệ, phát hành ACTIVE 30 ngày.",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: indicatorId }) },
    );
    expect(approveRes.status).toBe(200);
    const approveData = ApproveImmunityResponseSchema.parse(await approveRes.json());
    expect(approveData.indicator.status).toBe("ACTIVE");
    expect(approveData.indicator.ttlHours).toBe(720);

    // 11. USER_B2C_NEW scans 990123456789 -> immediate TIER_1_PRE_VISION hit
    setLLMProviderForTest(makeQaLlmProvider({ mode: "BENIGN" }));
    const b2cNewHitRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          recipientAccount: "990123456789",
        },
      }),
    );
    expect(b2cNewHitRes.status).toBe(200);
    const b2cNewHit = ShieldScanResponseSchema.parse(await b2cNewHitRes.json());
    expect(b2cNewHit.immunityTierMatched).toBe("TIER_1_PRE_VISION");
    expect(b2cNewHit.immunityHit?.indicatorId).toBe(indicatorId);
    expect(b2cNewHit.immunityHit?.status).toBe("ACTIVE");

    // 12. Submit TT 53/2026 Appeal
    const appealRes = await postAppeal(
      makeRequest(`/api/immunity/${indicatorId}/appeal`, sessionId, {
        body: {
          appellantName: "Nguyễn Văn A (Mô phỏng)",
          appellantNote: "Yêu cầu con người rà soát lại theo Thông tư 53/2026/TT-NHNN.",
          actorId: "USER_B2C_NEW",
        },
      }),
      { params: Promise.resolve({ id: indicatorId }) },
    );
    expect(appealRes.status).toBe(201);
    const appealData = CreateAppealResponseSchema.parse(await appealRes.json());
    expect(appealData.appeal.status).toBe("PENDING_HUMAN_REVIEW");

    // 13. Checker resolves OVERTURNED_ROLLBACK
    const resolveRes = await postResolveAppeal(
      makeRequest(`/api/immunity/${indicatorId}/resolve-appeal`, sessionId, {
        body: {
          appealId: appealData.appeal.appealId,
          reviewerId: "RISK_CHECKER_LAN",
          reviewerRole: "RISK_CHECKER",
          resolution: "OVERTURNED_ROLLBACK",
          resolutionNote: "Chấp nhận khiếu nại TT 53/2026 và thu hồi chỉ báo tức thì.",
        },
      }),
      { params: Promise.resolve({ id: indicatorId }) },
    );
    expect(resolveRes.status).toBe(200);
    const resolveData = ResolveAppealResponseSchema.parse(await resolveRes.json());
    expect(resolveData.appeal.status).toBe("OVERTURNED_ROLLBACK");
    expect(resolveData.indicator.status).toBe("ROLLED_BACK");

    // 14. USER_B2C_NEW rescans -> warning is GONE immediately
    const b2cAfterRollbackRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          recipientAccount: "990123456789",
        },
      }),
    );
    expect(b2cAfterRollbackRes.status).toBe(200);
    const b2cAfterRollback = ShieldScanResponseSchema.parse(await b2cAfterRollbackRes.json());
    expect(b2cAfterRollback.immunityHit).toBeNull();
    expect(b2cAfterRollback.immunityTierMatched).toBe("NONE");

    // 15. Verify full chronological audit_logs chain
    const immunityRes = await getImmunity(makeRequest("/api/immunity", sessionId));
    expect(immunityRes.status).toBe(200);
    const immunityData = ImmunityListResponseSchema.parse(await immunityRes.json());
    const actionsChronological = [...immunityData.auditLogs]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((l) => l.action);

    for (const expectedAction of [
      "CONSENT_UPDATED",
      "SCAN_COMPLETED",
      "TRANSFER_HELD_24H",
      "FAMILY_ESCALATED",
      "INVESTIGATION_RUN",
      "IMMUNITY_PROPOSED",
      "IMMUNITY_APPROVED",
      "APPEAL_SUBMITTED",
      "APPEAL_RESOLVED",
    ] as const) {
      expect(actionsChronological).toContain(expectedAction);
    }
    expect(actionsChronological.indexOf("IMMUNITY_PROPOSED")).toBeLessThan(
      actionsChronological.indexOf("IMMUNITY_APPROVED"),
    );
    expect(actionsChronological.indexOf("IMMUNITY_APPROVED")).toBeLessThan(
      actionsChronological.indexOf("APPEAL_SUBMITTED"),
    );
    expect(actionsChronological.indexOf("APPEAL_SUBMITTED")).toBeLessThan(
      actionsChronological.indexOf("APPEAL_RESOLVED"),
    );
  });

  it("E2E-02 (Minh Anh — APK): Scan CASE-02 real PNG -> report-cyber -> 1-source guardrail -> ACTIVE blocked 400 -> SOFT_WARNING 72h -> B2C hit -> expire-demo -> warning GONE", async () => {
    const sessionId = createSessionId("w4-e2e02");
    setLLMProviderForTest(makeQaLlmProvider({ mode: "CASE-02" }));

    // 1. Scan CASE-02 real PNG (public/demo-images/vneid-apk.png)
    const scanRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: { userId: "USER_B2C_NEW", inputType: "DEMO_PRESET", presetCode: "CASE-02" },
      }),
    );
    expect(scanRes.status).toBe(200);
    const scanData = ShieldScanResponseSchema.parse(await scanRes.json());
    expect(scanData.result.scam_category).toBe("APK_MALWARE_BAIT");
    expect(scanData.result.cyber_threat_flags.some((f) => f.type === "APK_ACCESSIBILITY_BAIT")).toBe(
      true,
    );

    // 2. Report cyber to B2E
    const cyberRes = await postReportCyber(
      makeRequest("/api/shield/report-cyber", sessionId, {
        body: { userId: "USER_B2C_NEW", scanId: scanData.scanId, note: "Nhắn dụ cài .apk" },
      }),
    );
    expect(cyberRes.status).toBe(200);
    const cyberData = ReportCyberResponseSchema.parse(await cyberRes.json());
    expect(cyberData.caseRecord.sanitizedMinute0?.contains_raw_image).toBe(false);

    // 3. War-Room 4 Agents on CASE-02 -> deterministic Layer-2 guardrail forces eligible_for_active_immunity === false
    const invRes = await postInvestigate(
      makeRequest(`/api/warroom/cases/${cyberData.caseId}/investigate`, sessionId, {
        body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
      }),
      { params: Promise.resolve({ caseId: cyberData.caseId }) },
    );
    expect(invRes.status).toBe(200);
    const invData = InvestigateCaseResponseSchema.parse(await invRes.json());
    expect(invData.debate.synthesis.independent_sources).toHaveLength(1);
    expect(invData.debate.synthesis.eligible_for_active_immunity).toBe(false);

    // 4. Maker attempting ACTIVE with 1 source is blocked 400
    const blockedRes = await postDecision(
      makeRequest(`/api/warroom/cases/${cyberData.caseId}/decision`, sessionId, {
        body: {
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Thử ép phát hành ACTIVE dù mới có 1 nguồn",
          indicatorType: "URL_DOMAIN",
          indicatorValue: "dichvucong-xacminh-hoso.example",
          requestedLevel: "ACTIVE",
          evidenceSources: invData.debate.synthesis.independent_sources,
        },
      }),
      { params: Promise.resolve({ caseId: cyberData.caseId }) },
    );
    expect(blockedRes.status).toBe(400);
    expect((await blockedRes.json()).code).toBe("INSUFFICIENT_EVIDENCE_SOURCES");

    // 5. Maker publishes SOFT_WARNING 72h
    const softRes = await postDecision(
      makeRequest(`/api/warroom/cases/${cyberData.caseId}/decision`, sessionId, {
        body: {
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Phát hành Cảnh báo mềm 72h theo Lớp 1.",
          indicatorType: "URL_DOMAIN",
          indicatorValue: "dichvucong-xacminh-hoso.example",
          requestedLevel: "SOFT_WARNING",
          evidenceSources: invData.debate.synthesis.independent_sources,
        },
      }),
      { params: Promise.resolve({ caseId: cyberData.caseId }) },
    );
    expect(softRes.status).toBe(200);
    const softData = CaseDecisionResponseSchema.parse(await softRes.json());
    const indicatorId = softData.indicator!.indicatorId;
    expect(softData.indicator?.status).toBe("SOFT_WARNING");
    expect(softData.indicator?.ttlHours).toBe(72);

    // 6. USER_B2C_NEW scans the .apk URL -> sees SOFT_WARNING hit
    setLLMProviderForTest(makeQaLlmProvider({ mode: "BENIGN" }));
    const hitRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          url: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
        },
      }),
    );
    expect(hitRes.status).toBe(200);
    const hitData = ShieldScanResponseSchema.parse(await hitRes.json());
    expect(hitData.immunityTierMatched).toBe("TIER_1_PRE_VISION");
    expect(hitData.immunityHit?.status).toBe("SOFT_WARNING");

    // 7. Checker clicks expire-demo -> EXPIRED
    const expireRes = await postExpireDemo(
      makeRequest(`/api/immunity/${indicatorId}/expire-demo`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Kiểm chứng Lớp 3 TTL hết hạn (MẪU MÔ PHỎNG)",
        },
      }),
      { params: Promise.resolve({ id: indicatorId }) },
    );
    expect(expireRes.status).toBe(200);
    const expireData = ExpireDemoResponseSchema.parse(await expireRes.json());
    expect(expireData.indicator.status).toBe("EXPIRED");

    // 8. USER_B2C_NEW rescans -> warning is GONE
    const afterExpireRes = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        body: {
          userId: "USER_B2C_NEW",
          inputType: "TEXT_LOOKUP",
          url: "https://dichvucong-xacminh-hoso.example/capnhat.apk",
        },
      }),
    );
    expect(afterExpireRes.status).toBe(200);
    const afterExpire = ShieldScanResponseSchema.parse(await afterExpireRes.json());
    expect(afterExpire.immunityHit).toBeNull();
    expect(afterExpire.immunityTierMatched).toBe("NONE");
  });

  it("E2E-03 (Chị Hoa — Livestream): 4 Agents on CASE-03 -> innocence_confidence >= 75 -> RECOMMEND_DISMISS_FP -> DISMISS_FP -> ZERO ImmunityIndicator created", async () => {
    const sessionId = createSessionId("w4-e2e03");
    await ensureSessionSeeded(sessionId);
    setLLMProviderForTest(makeQaLlmProvider({ mode: "CASE-03" }));

    const case03Id = `${sessionId}::CASE-03`;
    const invRes = await postInvestigate(
      makeRequest(`/api/warroom/cases/${case03Id}/investigate`, sessionId, {
        body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
      }),
      { params: Promise.resolve({ caseId: case03Id }) },
    );
    expect(invRes.status).toBe(200);
    const invData = InvestigateCaseResponseSchema.parse(await invRes.json());
    expect(invData.debate.agents.false_positive_defender.innocence_confidence).toBeGreaterThanOrEqual(
      75,
    );
    expect(invData.debate.agents.false_positive_defender.recommend_dismiss).toBe(true);
    expect(invData.debate.synthesis.recommendation).toBe("RECOMMEND_DISMISS_FP");
    expect(invData.debate.synthesis.eligible_for_active_immunity).toBe(false);

    const dismissRes = await postDecision(
      makeRequest(`/api/warroom/cases/${case03Id}/decision`, sessionId, {
        body: {
          decision: "DISMISS_FP",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Tiểu thương livestream bán hàng hợp pháp 14 tháng sạch, đóng cảnh báo giả.",
        },
      }),
      { params: Promise.resolve({ caseId: case03Id }) },
    );
    expect(dismissRes.status).toBe(200);
    const dismissData = CaseDecisionResponseSchema.parse(await dismissRes.json());
    expect(dismissData.caseStatus).toBe("DISMISSED_FP");
    expect(dismissData.indicator).toBeNull();

    const indicatorCount = await prisma.immunityIndicator.count({
      where: { demoSessionId: sessionId },
    });
    expect(indicatorCount).toBe(0);
  });
});

describe("Wave 4 QA — 4. 2-Browser Session Isolation + Reset Demo", () => {
  it("isolates cookie sessions browser-judge-A vs browser-judge-B and ensures reset in A does not touch B", async () => {
    const sessionA = createSessionId("browser-judge-A");
    const sessionB = createSessionId("browser-judge-B");
    setLLMProviderForTest(makeQaLlmProvider({ mode: "CASE-01" }));

    // Session A: consent, scan, hold, publish indicator
    await postConsent(
      makeRequest("/api/shield/consent", sessionA, {
        useCookieOnly: true,
        body: { userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" },
      }),
    );
    const scanARes = await postScan(
      makeRequest("/api/shield/scan", sessionA, {
        useCookieOnly: true,
        body: { userId: "USER_B2C_HUNG", inputType: "TEXT_LOOKUP", recipientAccount: "990111222333" },
      }),
    );
    const scanA = ShieldScanResponseSchema.parse(await scanARes.json());
    await postTransfer(
      makeRequest("/api/shield/transfer", sessionA, {
        useCookieOnly: true,
        body: {
          userId: "USER_B2C_HUNG",
          scanId: scanA.scanId,
          recipientAccount: "990111222333",
          recipientBank: "BANK_A",
          amountVnd: 9_500_000,
        },
      }),
    );
    await postDecision(
      makeRequest(`/api/warroom/cases/${sessionA}::CASE-01/decision`, sessionA, {
        useCookieOnly: true,
        body: {
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Session A soft warning",
          indicatorType: "BANK_ACCOUNT",
          indicatorValue: "990111222333",
          requestedLevel: "SOFT_WARNING",
          evidenceSources: ["MINUTE0_B2C_EVIDENCE"],
        },
      }),
      { params: Promise.resolve({ caseId: `${sessionA}::CASE-01` }) },
    );

    // Session B: consent, scan, hold, publish different indicator
    await postConsent(
      makeRequest("/api/shield/consent", sessionB, {
        useCookieOnly: true,
        body: { userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" },
      }),
    );
    const scanBRes = await postScan(
      makeRequest("/api/shield/scan", sessionB, {
        useCookieOnly: true,
        body: { userId: "USER_B2C_HUNG", inputType: "TEXT_LOOKUP", recipientAccount: "990444555666" },
      }),
    );
    const scanB = ShieldScanResponseSchema.parse(await scanBRes.json());
    await postTransfer(
      makeRequest("/api/shield/transfer", sessionB, {
        useCookieOnly: true,
        body: {
          userId: "USER_B2C_HUNG",
          scanId: scanB.scanId,
          recipientAccount: "990444555666",
          recipientBank: "BANK_B",
          amountVnd: 8_800_000,
        },
      }),
    );
    await postDecision(
      makeRequest(`/api/warroom/cases/${sessionB}::CASE-01/decision`, sessionB, {
        useCookieOnly: true,
        body: {
          decision: "PROPOSE_IMMUNITY",
          actorId: "RISK_MAKER_HUYEN",
          actorRole: "RISK_MAKER",
          rationale: "Session B soft warning",
          indicatorType: "BANK_ACCOUNT",
          indicatorValue: "990444555666",
          requestedLevel: "SOFT_WARNING",
          evidenceSources: ["MINUTE0_B2C_EVIDENCE"],
        },
      }),
      { params: Promise.resolve({ caseId: `${sessionB}::CASE-01` }) },
    );

    // Cross-session leak check before reset
    const snapBBefore = SessionResponseSchema.parse(
      await (await getSession(makeRequest("/api/session", sessionB, { useCookieOnly: true }))).json(),
    );
    expect(snapBBefore.holds.every((h) => h.recipientAccount === "990444555666")).toBe(true);
    expect(snapBBefore.indicators.some((i) => i.indicatorValue === "990111222333")).toBe(false);

    // Reset Session A
    const resetRes = await postDemoReset(
      makeRequest("/api/demo/reset", sessionA, { useCookieOnly: true, method: "POST" }),
    );
    expect(resetRes.status).toBe(200);
    const resetData = DemoResetResponseSchema.parse(await resetRes.json());
    expect(resetData.sessionId).toBe(sessionA);

    // Session A is wiped back to baseline; Session B is 100% preserved
    const snapAAfter = SessionResponseSchema.parse(
      await (await getSession(makeRequest("/api/session", sessionA, { useCookieOnly: true }))).json(),
    );
    const snapBAfter = SessionResponseSchema.parse(
      await (await getSession(makeRequest("/api/session", sessionB, { useCookieOnly: true }))).json(),
    );

    expect(snapAAfter.scansCount).toBe(0);
    expect(snapAAfter.holds).toHaveLength(0);
    expect(snapAAfter.indicators).toHaveLength(0);
    expect(snapAAfter.cases.every((c) => c.status === "OPEN")).toBe(true);

    expect(snapBAfter.scansCount).toBe(1);
    expect(snapBAfter.holds).toHaveLength(1);
    expect(snapBAfter.holds[0]?.recipientAccount).toBe("990444555666");
    expect(snapBAfter.indicators).toHaveLength(1);
    expect(snapBAfter.indicators[0]?.indicatorValue).toBe("990444555666");
    expect(snapBAfter.consents.find((c) => c.userId === "USER_B2C_HUNG")?.optIn24hHold).toBe(true);
  });
});

describe("Wave 4 QA — 5. Friendly Error Handling & Resilience", () => {
  it("enforces DB rate limit 429 with Retry-After header when active", async () => {
    const sessionId = createSessionId("w4-rl");
    const ip = "203.0.113.77";
    TEST_RATE_LIMIT_KEYS.push(`${ip}:${sessionId}`);
    setLLMProviderForTest(makeQaLlmProvider({ mode: "BENIGN" }));

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "2");
    vi.stubEnv("RATE_LIMIT_WINDOW_MS", "60000");

    const r1 = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        ip,
        body: { inputType: "TEXT_LOOKUP", lookupText: "kiểm tra 1" },
      }),
    );
    const r2 = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        ip,
        body: { inputType: "TEXT_LOOKUP", lookupText: "kiểm tra 2" },
      }),
    );
    const r3 = await postScan(
      makeRequest("/api/shield/scan", sessionId, {
        ip,
        body: { inputType: "TEXT_LOOKUP", lookupText: "kiểm tra 3" },
      }),
    );

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
    const retryAfter = Number.parseInt(r3.headers.get("retry-after") ?? "", 10);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect((await r3.json()).code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("handles daily LLM quota cap cleanly: friendly fallbackMode on /shield/scan and 429 DAILY_LLM_QUOTA_EXCEEDED on /investigate", async () => {
    const sessionId = createSessionId("w4-quota");
    await ensureSessionSeeded(sessionId);
    setLLMProviderForTest(makeQaLlmProvider({ mode: "CASE-01" }));

    const dateKey = getVietnamDateKey();
    const prevRow = await prisma.dailyLlmUsage.findUnique({ where: { dateKey } });

    try {
      await prisma.dailyLlmUsage.upsert({
        where: { dateKey },
        create: { dateKey, callCount: 5 },
        update: { callCount: 5 },
      });
      vi.stubEnv("DAILY_LLM_CALL_LIMIT", "5");

      const scanRes = await postScan(
        makeRequest("/api/shield/scan", sessionId, {
          body: {
            inputType: "TEXT_LOOKUP",
            lookupText: "Tin nhắn dụ cài bản cập nhật VNeID giả tại https://dichvucong-xacminh-hoso.example/capnhat.apk",
          },
        }),
      );
      expect(scanRes.status).toBe(200);
      const scanData = ShieldScanResponseSchema.parse(await scanRes.json());
      expect(scanData.fallbackMode).toBe(true);
      expect(scanData.fallbackNoticeVi?.trim().length).toBeGreaterThan(10);

      const invRes = await postInvestigate(
        makeRequest(`/api/warroom/cases/${sessionId}::CASE-03/investigate`, sessionId, {
          body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
        }),
        { params: Promise.resolve({ caseId: `${sessionId}::CASE-03` }) },
      );
      expect(invRes.status).toBe(429);
      expect((await invRes.json()).code).toBe("DAILY_LLM_QUOTA_EXCEEDED");
    } finally {
      if (prevRow) {
        await prisma.dailyLlmUsage.update({
          where: { dateKey },
          data: { callCount: prevRow.callCount },
        });
      } else {
        await prisma.dailyLlmUsage.deleteMany({ where: { dateKey } });
      }
    }
  });

  it("isolates slow agent timeout as AGENT_DEGRADED without crashing War-Room", async () => {
    const sessionId = createSessionId("w4-timeout");
    await ensureSessionSeeded(sessionId);
    vi.stubEnv("WARROOM_AGENT_TIMEOUT_MS", "35");
    setLLMProviderForTest(
      makeQaLlmProvider({ mode: "CASE-01", slowAgent: "compliance_rag", slowDelayMs: 180 }),
    );

    const invRes = await postInvestigate(
      makeRequest(`/api/warroom/cases/${sessionId}::CASE-01/investigate`, sessionId, {
        body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
      }),
      { params: Promise.resolve({ caseId: `${sessionId}::CASE-01` }) },
    );
    expect(invRes.status).toBe(200);
    const invData = InvestigateCaseResponseSchema.parse(await invRes.json());
    expect(invData.debate.agents.compliance_rag.status).toBe("AGENT_DEGRADED");
    expect(invData.debate.agents.compliance_rag.error_message).toMatch(/vượt quá giới hạn/i);
    expect(invData.debate.agents.graph_tracer.status).toBe("OK");
    expect(invData.debate.agents.evidence_correlator.status).toBe("OK");
    expect(invData.debate.agents.false_positive_defender.status).toBe("OK");
  });
});

describe("Wave 4 QA — 6. Real Measured Local Timings Report", () => {
  it("measures and logs actual local performance.now() timings across core TrustLoop subsystems", async () => {
    const sessionId = createSessionId("w4-timing");
    const timings: Record<string, number> = {};

    const tSeed0 = performance.now();
    await ensureSessionSeeded(sessionId);
    timings.db_session_bootstrap_ms = Number((performance.now() - tSeed0).toFixed(2));

    const tPii0 = performance.now();
    const raw = "CCCD 079062001234 SĐT 0912345678 số dư 145.000.000đ STK 990123456789";
    const { redacted } = redactText(raw, { preserveAccounts: ["990123456789"] });
    redactScanResult(
      ScanResultSchema.parse({
        status: "ANALYZED",
        risk_score: 90,
        risk_level: "CRITICAL",
        scam_category: "POLICE_IMPERSONATION",
        visual_tampering_flags: [],
        psych_manipulation_cues: [],
        cyber_threat_flags: [],
        extracted_entities: {
          recipient_account: "990123456789",
          recipient_bank: "SIM",
          urls: [],
          domains: [],
          amount_vnd: 9_500_000,
          apk_filenames: [],
        },
        calm_guidance_vi: redacted,
        deescalation_questions_vi: [],
      }),
      { rawUserText: raw },
    );
    timings.pii_redaction_ms = Number((performance.now() - tPii0).toFixed(2));

    const tGraph0 = performance.now();
    for (const fixture of SCENARIO_FIXTURES) {
      analyzeCaseGraph({ graphData: fixture.graphData, caseContext: fixture.caseContext });
    }
    timings.graph_analysis_3_cases_ms = Number((performance.now() - tGraph0).toFixed(2));

    const tRag0 = performance.now();
    const chunks = retrievePolicyChunks("QĐ 2345 smurfing 10 triệu TT 53 khiếu nại APK", 5);
    timings.bm25_rag_retrieval_ms = Number((performance.now() - tRag0).toFixed(2));
    expect(chunks.length).toBeGreaterThan(0);

    const tImm0 = performance.now();
    await lookupActiveImmunity(sessionId, { accounts: ["990123456789"] });
    timings.tier1_immunity_lookup_ms = Number((performance.now() - tImm0).toFixed(2));

    // Full local E2E-01 loop (local API + Prisma overhead with mocked LLM)
    setLLMProviderForTest(makeQaLlmProvider({ mode: "CASE-01" }));
    const tE2e0 = performance.now();
    await postConsent(
      makeRequest("/api/shield/consent", sessionId, {
        body: { userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" },
      }),
    );
    const sRes = ShieldScanResponseSchema.parse(
      await (
        await postScan(
          makeRequest("/api/shield/scan", sessionId, {
            body: { userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" },
          }),
        )
      ).json(),
    );
    const txRes = TransferResponseSchema.parse(
      await (
        await postTransfer(
          makeRequest("/api/shield/transfer", sessionId, {
            body: {
              userId: "USER_B2C_HUNG",
              scanId: sRes.scanId,
              recipientAccount: "990123456789",
              recipientBank: "NGAN_HANG_MO_PHONG_X",
              amountVnd: 9_500_000,
            },
          }),
        )
      ).json(),
    );
    const escRes = FamilyEscalateResponseSchema.parse(
      await (
        await postFamilyEscalate(
          makeRequest(`/api/shield/family/escalate/${txRes.txId}`, sessionId, {
            body: { guardianId: "FAMILY_MINH" },
          }),
          { params: Promise.resolve({ txId: txRes.txId }) },
        )
      ).json(),
    );
    const invRes = InvestigateCaseResponseSchema.parse(
      await (
        await postInvestigate(
          makeRequest(`/api/warroom/cases/${escRes.caseId}/investigate`, sessionId, {
            body: { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" },
          }),
          { params: Promise.resolve({ caseId: escRes.caseId }) },
        )
      ).json(),
    );
    const decRes = CaseDecisionResponseSchema.parse(
      await (
        await postDecision(
          makeRequest(`/api/warroom/cases/${escRes.caseId}/decision`, sessionId, {
            body: {
              decision: "PROPOSE_IMMUNITY",
              actorId: "RISK_MAKER_HUYEN",
              actorRole: "RISK_MAKER",
              rationale: "Local E2E timing probe",
              indicatorType: "BANK_ACCOUNT",
              indicatorValue: "990123456789",
              requestedLevel: "ACTIVE",
              evidenceSources: invRes.debate.synthesis.independent_sources,
            },
          }),
          { params: Promise.resolve({ caseId: escRes.caseId }) },
        )
      ).json(),
    );
    await postApprove(
      makeRequest(`/api/immunity/${decRes.indicator!.indicatorId}/approve`, sessionId, {
        body: {
          checkerId: "RISK_CHECKER_TUAN",
          checkerRole: "RISK_CHECKER",
          rationale: "Local E2E timing probe",
          ttlHours: 720,
        },
      }),
      { params: Promise.resolve({ id: decRes.indicator!.indicatorId }) },
    );
    timings.local_e2e01_loop_mocked_llm_ms = Number((performance.now() - tE2e0).toFixed(2));

    console.info("[WAVE4_LOCAL_TIMINGS_MS]", JSON.stringify(timings));
    for (const val of Object.values(timings)) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
    expect(DEMO_SIMULATION_LABEL).toBe("MẪU MÔ PHỎNG");
    expect(DebateSynthesisSchema).toBeDefined();
  });
});
