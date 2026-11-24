import { NextResponse } from "next/server";
import { DEMO_SIMULATION_LABEL, StrConfirmRequestSchema, StrStatusResponseSchema } from "@/contracts";
import { RISK_LEVEL_META, SCAM_CATEGORY_VI } from "@/components/b2c/labels";
import { maskAccount } from "@/lib/guardian";
import { prisma } from "@/lib/prisma";
import { checkDbRateLimit, extractClientIp } from "@/lib/rate-limit";
import { ensureSessionSeeded, getSessionId } from "@/lib/session";
import { computeStrDeadline, STR_BASIS_VI } from "@/lib/str";

export const dynamic = "force-dynamic";

/**
 * #7 — suspicious-transaction report for a case with Kết luận rủi ro cao (status CLOSED).
 * GET: draft + legal deadline. POST: a B2E person confirms the (simulated) submission. Nothing is
 * ever sent automatically and nothing leaves the demo.
 */
// shortcut: "phát hiện" = when the case was concluded (case.updatedAt at CLOSED); store an explicit
// detectedAt if cases can be edited after closing.
const B2E_ROLES = new Set(["RISK_MAKER", "RISK_CHECKER"]);
const FRAUD_CATEGORIES = new Set([
  "POLICE_IMPERSONATION",
  "APK_MALWARE_BAIT",
  "BANK_IMPERSONATION",
  "INVESTMENT_SCAM",
  "SOCIAL_ENGINEERING",
]);

async function loadStatus(demoSessionId: string, caseId: string) {
  const c = await prisma.investigationCase.findFirst({ where: { caseId, demoSessionId } });
  if (!c) return null;
  const confirmed = await prisma.auditLog.findFirst({
    where: { demoSessionId, action: "STR_SUBMISSION_CONFIRMED", targetId: caseId },
    orderBy: { createdAt: "asc" },
  });
  const empty = {
    caseId,
    eligible: false,
    criminalSigns: false,
    detectedAt: null,
    occurredAt: null,
    deadline: null,
    basis: null,
    basisVi: null,
    overdue: false,
    draftVi: null,
    confirmedAt: null,
    confirmedBy: null,
  };
  if (c.status !== "CLOSED") return { row: c, status: empty };

  const tx = c.txId ? await prisma.heldTransaction.findFirst({ where: { txId: c.txId, demoSessionId } }) : null;
  const minute0 = (() => {
    try {
      return JSON.parse(c.sanitizedMinute0Json ?? "null") as {
        scam_category?: string;
        risk_level?: string;
        risk_score?: number;
      } | null;
    } catch {
      return null;
    }
  })();
  // Lừa đảo chiếm đoạt tài sản is itself a criminal sign (Điều 37.3); a legit/unknown category is not.
  const criminalSigns = FRAUD_CATEGORIES.has(minute0?.scam_category ?? "");
  const detectedAt = c.updatedAt;
  const occurredAt = tx?.createdAt ?? c.createdAt;
  const d = computeStrDeadline({ detectedAt, occurredAt, criminalSigns });
  const draftVi = [
    `BẢN NHÁP BÁO CÁO GIAO DỊCH ĐÁNG NGỜ — ${DEMO_SIMULATION_LABEL} (không gửi thật)`,
    `Vụ: ${c.title}`,
    tx
      ? `Giao dịch: ${tx.amountVnd.toLocaleString("vi-VN")}đ tới tài khoản ${maskAccount(tx.recipientAccount)} (${tx.recipientBank}), phát sinh ${tx.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
      : "Giao dịch: không gắn với giao dịch tạm giữ",
    minute0?.scam_category
      ? `Dấu hiệu: ${SCAM_CATEGORY_VI[minute0.scam_category as keyof typeof SCAM_CATEGORY_VI] ?? minute0.scam_category}${
          minute0.risk_level
            ? ` · rủi ro ${RISK_LEVEL_META[minute0.risk_level as keyof typeof RISK_LEVEL_META]?.labelVi ?? minute0.risk_level}`
            : ""
        }${typeof minute0.risk_score === "number" ? ` (${minute0.risk_score}/100)` : ""}`
      : "Dấu hiệu: xem hồ sơ War-Room",
    `Kết luận nội bộ: rủi ro cao (không phải kết luận về tội phạm)`,
    `Hạn gửi: ${STR_BASIS_VI[d.basis]}`,
  ].join("\n");

  return {
    row: c,
    status: {
      caseId,
      eligible: true,
      criminalSigns,
      detectedAt: detectedAt.toISOString(),
      occurredAt: occurredAt.toISOString(),
      deadline: d.deadline.toISOString(),
      basis: d.basis,
      basisVi: STR_BASIS_VI[d.basis],
      overdue: !confirmed && d.isOverdue(new Date()),
      draftVi,
      confirmedAt: confirmed?.createdAt.toISOString() ?? null,
      confirmedBy: confirmed?.actorId ?? null,
    },
  };
}

export async function GET(request: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await context.params;
    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);
    const loaded = await loadStatus(demoSessionId, caseId);
    if (!loaded) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ trong phiên hiện tại.", code: "CASE_NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json(StrStatusResponseSchema.parse(loaded.status));
  } catch (err) {
    console.error("[GET /api/warroom/cases/[caseId]/str]", err);
    return NextResponse.json({ error: "Không thể tải bản nháp báo cáo.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await context.params;
    const parsed = StrConfirmRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Yêu cầu không hợp lệ.", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    // shortcut: actorRole is client-asserted like every demo persona; bind to real auth before production.
    if (!B2E_ROLES.has(parsed.data.actorRole)) {
      return NextResponse.json(
        { error: "Chỉ chuyên viên đội Risk có thẩm quyền mới xác nhận gửi báo cáo.", code: "FORBIDDEN_ROLE" },
        { status: 403 },
      );
    }
    const demoSessionId = getSessionId(request);
    const rateLimit = await checkDbRateLimit(extractClientIp(request), demoSessionId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Bạn vừa gửi quá nhiều yêu cầu. Vui lòng thử lại sau.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
      );
    }
    await ensureSessionSeeded(demoSessionId);
    const loaded = await loadStatus(demoSessionId, caseId);
    if (!loaded) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ trong phiên hiện tại.", code: "CASE_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (!loaded.status.eligible) {
      return NextResponse.json(
        { error: "Vụ này chưa có Kết luận rủi ro cao nên chưa có báo cáo để gửi.", code: "NOT_CONCLUDED" },
        { status: 409 },
      );
    }
    if (loaded.status.confirmedAt) {
      return NextResponse.json(
        { error: "Báo cáo của vụ này đã được xác nhận gửi.", code: "ALREADY_CONFIRMED" },
        { status: 409 },
      );
    }

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: parsed.data.actorId,
        actorRole: parsed.data.actorRole,
        action: "STR_SUBMISSION_CONFIRMED",
        targetId: caseId,
        rationale: `Xác nhận gửi báo cáo giao dịch đáng ngờ (${DEMO_SIMULATION_LABEL} — không gửi thật). Hạn: ${loaded.status.basisVi}.`,
        metadataJson: JSON.stringify({
          deadline: loaded.status.deadline,
          basis: loaded.status.basis,
          overdueAtConfirmation: loaded.status.overdue,
        }),
      },
    });
    const after = await loadStatus(demoSessionId, caseId);
    return NextResponse.json(StrStatusResponseSchema.parse(after!.status));
  } catch (err) {
    console.error("[POST /api/warroom/cases/[caseId]/str]", err);
    return NextResponse.json({ error: "Không thể xác nhận gửi báo cáo.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
