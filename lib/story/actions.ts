import type { z } from "zod";
import {
  DEMO_SIMULATION_LABEL,
  ApproveImmunityResponseSchema,
  CaseDecisionResponseSchema,
  ConsentResponseSchema,
  FamilyEscalateResponseSchema,
  HeldTxStatusSchema,
  type HeldTxStatus,
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
import { CAST } from "@/lib/cast";
import type { BeatId } from "@/lib/story/machine";

/** CASE-01: the seeded mule account and the first of Bác Hùng's 4 × 9,5 triệu transfers. */
// shortcut: the story sends only the first of the 4 transfers; loop the other 3 if the stage ever shows smurfing live.
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
  optInScan: true, // #5: a separate purpose, granted explicitly in the same beat
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
  senderLabel: `${CAST.USER_B2C_HUNG.name} (62 tuổi)`,
  scanId,
  recipientAccount: STORY_RECIPIENT_ACCOUNT,
  recipientBank: `Ngân hàng nhận (${DEMO_SIMULATION_LABEL})`,
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
  /** The page's own demo session; sent on every call so another tab's cookie cannot redirect it. */
  session?: string;
  scanId?: string;
  txId?: string;
  caseId?: string;
  debate?: WarRoomDebate;
  indicatorId?: string;
  makerRationale?: string;
  checkerRationale?: string;
}

type Results = Partial<Record<BeatId, unknown>>;
const field = (v: unknown, key: string): unknown =>
  v && typeof v === "object" ? (v as Record<string, unknown>)[key] : undefined;

/** Ids the next beats need, read from earlier beats' API responses. */
export function storyContext(results: Results): StoryContext {
  const ctx: StoryContext = {};
  const set = <K extends keyof StoryContext>(key: K, value: unknown) => {
    if (value !== undefined) ctx[key] = value as StoryContext[K];
  };
  set("scanId", field(results["1.2"], "scanId"));
  set("txId", field(results["2.1"], "txId"));
  set("caseId", field(results["2.2"], "caseId"));
  set("debate", field(results["3.1"], "debate"));
  set("indicatorId", field(field(results["3.2"], "indicator"), "indicatorId"));
  return ctx;
}

/** Governance (Layer 2) needs ≥2 evidence sources of different TYPES (prefix before "_"). */
function sourceTypes(sources: string[]): number {
  return new Set(sources.map((s) => s.split("_")[0])).size;
}

function withSession(url: string, session: string | undefined): string {
  return session ? `${url}${url.includes("?") ? "&" : "?"}session=${encodeURIComponent(session)}` : url;
}

async function call<S extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: S,
  storyCheck?: (json: Record<string, unknown>) => string | null,
): Promise<z.infer<S>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  // the API's own Vietnamese message (rate limit, 503 LLM_NOT_CONFIGURED, Maker≠Checker 403…) is shown as-is
  if (!res.ok) throw new Error(json.error ?? `Yêu cầu thất bại (${res.status}).`);
  // a 200 is not enough: the story only advances when the thing it narrates actually happened
  const storyProblem = storyCheck?.(json);
  if (storyProblem) throw new Error(storyProblem);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new Error("Phản hồi không hợp lệ từ máy chủ. Vui lòng thử lại.");
  return parsed.data;
}

/** Server requires ≥3 characters; say so in Vietnamese before calling it. */
function reason(text: string): string {
  if (text.trim().length < 3) throw new Error("Hãy viết lý do (ít nhất 3 ký tự) trước khi gửi.");
  return text.trim();
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Thiếu ${what} từ bước trước.`);
  return value;
}

/** Runs one beat against the existing API routes; the session comes from the page's cookie / ?session=. */
export async function runBeat(id: BeatId, ctx: StoryContext): Promise<unknown> {
  switch (id) {
    case "1.1":
      return call(withSession("/api/shield/consent", ctx.session), buildConsent(), ConsentResponseSchema);
    case "1.2":
      return call(withSession("/api/shield/scan", ctx.session), buildScan(), ShieldScanResponseSchema);
    case "2.1":
      return call(
        withSession("/api/shield/transfer", ctx.session),
        buildTransfer(need(ctx.scanId, "lượt quét")),
        TransferResponseSchema,
        (json) =>
          json.status === "ON_HOLD_24H"
            ? null
            : "Giao dịch không bị tạm giữ (điểm rủi ro của lượt quét thấp hơn ngưỡng), nên câu chuyện dừng ở đây. Hãy bắt đầu phiên mới.",
      );
    case "2.2":
      return call(
        withSession(`/api/shield/family/escalate/${encodeURIComponent(need(ctx.txId, "giao dịch"))}`, ctx.session),
        buildEscalate(),
        FamilyEscalateResponseSchema,
      );
    case "3.1":
      return call(
        withSession(
          `/api/warroom/cases/${encodeURIComponent(need(ctx.caseId, "vụ điều tra"))}/investigate`,
          ctx.session,
        ),
        buildInvestigate(),
        InvestigateCaseResponseSchema,
      );
    case "3.2": {
      const debate = need(ctx.debate, "kết quả War-Room");
      if (sourceTypes(debate.synthesis.independent_sources) < 2)
        throw new Error(
          "War-Room chưa tìm đủ bằng chứng từ 2 loại nguồn độc lập, nên chưa thể đề xuất kích hoạt chỉ báo (quy tắc quản trị).",
        );
      return call(
        withSession(`/api/warroom/cases/${encodeURIComponent(need(ctx.caseId, "vụ điều tra"))}/decision`, ctx.session),
        buildMakerDecision(debate, reason(ctx.makerRationale ?? MAKER_DRAFT_VI)),
        CaseDecisionResponseSchema,
      );
    }
    case "4.1": {
      const body = buildApprove(reason(ctx.checkerRationale ?? CHECKER_DRAFT_VI));
      const approved = await call(
        withSession(`/api/immunity/${encodeURIComponent(need(ctx.indicatorId, "chỉ báo"))}/approve`, ctx.session),
        body,
        ApproveImmunityResponseSchema,
      );
      // approval cancels the held transfer only if it is still on hold; read it back instead of assuming
      // the approval already happened: a failed read must not fail (and re-run) the beat
      let txStatus: HeldTxStatus | undefined;
      try {
        const res = await fetch(withSession("/api/shield/family/holds", ctx.session), { cache: "no-store" });
        const json = (await res.json()) as { holds?: { txId?: string; status?: unknown }[] };
        const status = HeldTxStatusSchema.safeParse(json.holds?.find((h) => h.txId === ctx.txId)?.status);
        txStatus = status.success ? status.data : undefined;
      } catch {
        txStatus = undefined;
      }
      return { ...approved, txStatus };
    }
    case "4.2":
      return call(
        withSession("/api/shield/scan", ctx.session),
        buildNewUserProbe(),
        ShieldScanResponseSchema,
        (json) => (json.immunityHit ? null : "Người dùng mới không thấy cảnh báo: chỉ báo chưa có hiệu lực."),
      );
  }
}
