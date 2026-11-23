import type { z } from "zod";
import {
  ApproveImmunityResponseSchema,
  CaseDecisionResponseSchema,
  ConsentResponseSchema,
  FamilyEscalateResponseSchema,
  InvestigateCaseResponseSchema,
  ShieldScanResponseSchema,
  TransferResponseSchema,
  type ApproveImmunityRequest,
  type CaseDecisionRequest,
  type ConsentRequest,
  type FamilyEscalateRequest,
  type InvestigateCaseRequest,
  type ShieldScanRequest,
  type TransferRequest,
  type WarRoomDebate,
} from "@/contracts";
import type { BeatId } from "@/lib/story/machine";

/** CASE-01: the seeded mule account and the first of Bác Hùng's 4 × 9,5 triệu transfers. */
export const STORY_RECIPIENT_ACCOUNT = "990123456789";
export const STORY_AMOUNT_VND = 9_500_000;
export const STORY_PRESET = "CASE-01" as const;

export const MAKER_DRAFT_VI =
  "Kết luận rủi ro cao: tài khoản nhận nằm trong cụm ví trung gian chia nhỏ tiền, khớp tin nhắn giả danh công an và cờ liên ngân hàng.";
export const CHECKER_DRAFT_VI =
  "Đã kiểm tra lại độc lập các nguồn bằng chứng; đồng ý kích hoạt chỉ báo cho tài khoản này.";

export const buildConsent = (): ConsentRequest => ({
  userId: "USER_B2C_HUNG",
  optIn24hHold: true,
  guardianId: "FAMILY_MINH",
  consentVersion: "v1.0-law91-2025",
});

export const buildScan = (): ShieldScanRequest => ({
  userId: "USER_B2C_HUNG",
  inputType: "DEMO_PRESET",
  presetCode: STORY_PRESET,
});

export const buildTransfer = (scanId: string): TransferRequest => ({
  userId: "USER_B2C_HUNG",
  senderLabel: "Bác Hùng (62 tuổi)",
  scanId,
  recipientAccount: STORY_RECIPIENT_ACCOUNT,
  recipientBank: "Ngân hàng nhận (MẪU MÔ PHỎNG)",
  amountVnd: STORY_AMOUNT_VND,
});

export const buildEscalate = (): FamilyEscalateRequest => ({
  guardianId: "FAMILY_MINH",
  note: "Người giám hộ chuyển vụ cho đội Risk xem xét.",
});

export const buildInvestigate = (): InvestigateCaseRequest => ({
  actorId: "RISK_MAKER_HUYEN",
  actorRole: "RISK_MAKER",
});

export const buildMakerDecision = (debate: WarRoomDebate, rationale: string): CaseDecisionRequest => ({
  decision: "PROPOSE_IMMUNITY",
  actorId: "RISK_MAKER_HUYEN",
  actorRole: "RISK_MAKER",
  rationale,
  indicatorType: "BANK_ACCOUNT",
  indicatorValue: STORY_RECIPIENT_ACCOUNT,
  requestedLevel: "ACTIVE",
  evidenceSources: debate.synthesis.independent_sources,
});

export const buildApprove = (rationale: string): ApproveImmunityRequest => ({
  checkerId: "RISK_CHECKER_TUAN",
  checkerRole: "RISK_CHECKER",
  rationale,
  ttlHours: 720,
});

export const buildNewUserProbe = (): ShieldScanRequest => ({
  userId: "USER_B2C_NEW",
  inputType: "TEXT_LOOKUP",
  recipientAccount: STORY_RECIPIENT_ACCOUNT,
});

/** Ids and inputs gathered from earlier beats' results. */
export interface StoryContext {
  scanId?: string;
  txId?: string;
  caseId?: string;
  debate?: WarRoomDebate;
  indicatorId?: string;
  rationale?: string;
}

async function call<S extends z.ZodTypeAny>(url: string, body: unknown, schema: S): Promise<z.infer<S>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  // the API's own Vietnamese message (rate limit, 503 LLM_NOT_CONFIGURED, Maker≠Checker 403…) is shown as-is
  if (!res.ok) throw new Error(json.error ?? `Yêu cầu thất bại (${res.status}).`);
  return schema.parse(json);
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Thiếu ${what} từ bước trước.`);
  return value;
}

/** Runs one beat against the existing API routes; the session comes from the page's cookie / ?session=. */
export async function runBeat(id: BeatId, ctx: StoryContext): Promise<unknown> {
  switch (id) {
    case "1.1":
      return call("/api/shield/consent", buildConsent(), ConsentResponseSchema);
    case "1.2":
      return call("/api/shield/scan", buildScan(), ShieldScanResponseSchema);
    case "2.1":
      return call("/api/shield/transfer", buildTransfer(need(ctx.scanId, "lượt quét")), TransferResponseSchema);
    case "2.2":
      return call(
        `/api/shield/family/escalate/${encodeURIComponent(need(ctx.txId, "giao dịch"))}`,
        buildEscalate(),
        FamilyEscalateResponseSchema,
      );
    case "3.1":
      return call(
        `/api/warroom/cases/${encodeURIComponent(need(ctx.caseId, "vụ điều tra"))}/investigate`,
        buildInvestigate(),
        InvestigateCaseResponseSchema,
      );
    case "3.2":
      return call(
        `/api/warroom/cases/${encodeURIComponent(need(ctx.caseId, "vụ điều tra"))}/decision`,
        buildMakerDecision(need(ctx.debate, "kết quả War-Room"), ctx.rationale ?? MAKER_DRAFT_VI),
        CaseDecisionResponseSchema,
      );
    case "4.1":
      return call(
        `/api/immunity/${encodeURIComponent(need(ctx.indicatorId, "chỉ báo"))}/approve`,
        buildApprove(ctx.rationale ?? CHECKER_DRAFT_VI),
        ApproveImmunityResponseSchema,
      );
    case "4.2":
      return call("/api/shield/scan", buildNewUserProbe(), ShieldScanResponseSchema);
  }
}
