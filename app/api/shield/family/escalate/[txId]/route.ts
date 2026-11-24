import { NextResponse } from "next/server";
import {
  DEMO_SIMULATION_LABEL,
  FamilyEscalateRequestSchema,
  FamilyEscalateResponseSchema,
  GraphDataSchema,
  SanitizedEvidenceSchema,
  type SanitizedEvidence,
} from "@/contracts";
import { acceptedOwnersOf, guardianDenied } from "@/lib/guardian";
import { prisma } from "@/lib/prisma";
import {
  ensureSessionSeeded,
  getSessionId,
  releaseExpiredHolds,
  toInvestigationCaseDto,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ txId: string }> },
) {
  try {
    const { txId } = await context.params;
    const rawBody = await request.text();
    const parsedBody = rawBody.trim() ? JSON.parse(rawBody) : {};
    const parsed = FamilyEscalateRequestSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu báo cáo lên phòng rủi ro không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);
    await releaseExpiredHolds(demoSessionId);

    const tx = await prisma.heldTransaction.findFirst({
      where: { txId, demoSessionId },
    });
    if (!tx) {
      return NextResponse.json(
        { error: "Không tìm thấy giao dịch tạm giữ trong phiên hiện tại.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (tx.status === "CANCELLED_BY_USER" || tx.status === "COMPLETED" || tx.status === "RELEASED") {
      return NextResponse.json(
        {
          error: `Không thể chuyển vụ việc từ giao dịch ở trạng thái ${tx.status}.`,
          code: "INVALID_STATE",
        },
        { status: 409 },
      );
    }

    const { guardianId, note } = parsed.data;
    // Glossary "Yêu cầu xét lại tạm giữ": the wallet owner escalates their own hold for human review (TT 53).
    const isSelfReview = guardianId === tx.senderId;
    // shortcut: "self review" trusts guardianId === senderId as the owner acting (client-asserted identity,
    // see lib/guardian.ts); a guardian path always needs an accepted, unrevoked invitation.
    if (!isSelfReview) {
      const access = await acceptedOwnersOf(demoSessionId, guardianId);
      if (!access.accepted.includes(tx.senderId)) return guardianDenied(access);
    }
    const originLabel = isSelfReview ? "Người dùng yêu cầu xét lại" : "Gia đình báo cáo";
    const scan = tx.scanId
      ? await prisma.scanSession.findFirst({
          where: { scanId: tx.scanId, demoSessionId },
        })
      : null;

    let sanitizedEvidence: SanitizedEvidence;
    const parsedScanEvidence = scan
      ? SanitizedEvidenceSchema.safeParse(safeJson(scan.sanitizedEvidenceJson, null))
      : null;

    if (parsedScanEvidence?.success) {
      sanitizedEvidence = parsedScanEvidence.data;
    } else {
      sanitizedEvidence = SanitizedEvidenceSchema.parse({
        summary_vi: `Người thân (${guardianId}) chuyển tiếp giao dịch tạm giữ 24h tới TK ${tx.recipientAccount} (${tx.recipientBank}) để Phòng Rủi ro xác minh.`,
        scam_category: "SOCIAL_ENGINEERING",
        risk_score: 85,
        risk_level: "CRITICAL",
        psych_cue_types: [],
        cyber_threat_types: [],
        recipient_account: tx.recipientAccount,
        recipient_bank: tx.recipientBank,
        suspicious_urls: [],
        sanitized_excerpt: note?.trim() || "Chuyển tiếp từ màn hình Đồng thuận Gia đình (đã ẩn toàn bộ PII).",
        contains_raw_image: false,
        created_at: new Date().toISOString(),
      });
    }

    await prisma.heldTransaction.update({
      where: { txId: tx.txId },
      data: { status: "ESCALATED_TO_B2E" },
    });

    const normalizedAccount = tx.recipientAccount.replace(/[\s-]+/g, "");
    const case01Id = `${demoSessionId}::CASE-01`;
    const existingCase01 =
      normalizedAccount === "990123456789"
        ? await prisma.investigationCase.findUnique({ where: { caseId: case01Id } })
        : null;

    let savedCase;
    if (existingCase01) {
      const existingCtx = safeJson<Record<string, unknown>>(existingCase01.caseContextJson, {});
      savedCase = await prisma.investigationCase.update({
        where: { caseId: existingCase01.caseId },
        data: {
          txId: tx.txId,
          status: "OPEN",
          sanitizedMinute0Json: JSON.stringify(sanitizedEvidence),
          caseContextJson: JSON.stringify({
            ...existingCtx,
            familyEscalatedBy: guardianId,
            familyEscalationNote: note ?? null,
            escalatedTxId: tx.txId,
            escalationOrigin: originLabel,
            escalatedAt: new Date().toISOString(),
          }),
        },
      });
    } else {
      const graphData = GraphDataSchema.parse({
        nodes: [
          {
            id: `SENDER_${tx.senderId}`,
            type: "VICTIM",
            label: tx.senderLabel,
            metadata: { simulationLabel: DEMO_SIMULATION_LABEL },
          },
          {
            id: `ACC_${normalizedAccount.slice(-8)}`,
            type: "BANK_ACCOUNT",
            label: `TK ${tx.recipientAccount} (${tx.recipientBank})`,
            risk_score: sanitizedEvidence.risk_score,
            flagged: true,
            metadata: { simulationLabel: DEMO_SIMULATION_LABEL },
          },
        ],
        edges: [
          {
            id: `EDGE_ESC_${tx.txId.slice(-8)}`,
            source: `SENDER_${tx.senderId}`,
            target: `ACC_${normalizedAccount.slice(-8)}`,
            edge_type: "TRANSFER",
            label: `${tx.amountVnd.toLocaleString("vi-VN")}đ (Tạm giữ 24h)`,
            amount_vnd: tx.amountVnd,
            tx_count: 1,
            flagged: true,
          },
        ],
        summary_badge: `${DEMO_SIMULATION_LABEL} · ${originLabel}`,
      });

      savedCase = await prisma.investigationCase.create({
        data: {
          demoSessionId,
          txId: tx.txId,
          scenarioCode: "CASE-FAMILY-CUSTOM",
          title: `[${DEMO_SIMULATION_LABEL}] ${originLabel} — TK ${tx.recipientAccount}`,
          subtitle: `${DEMO_SIMULATION_LABEL} · Chuyển tiếp bởi ${guardianId}`,
          status: "OPEN",
          graphDataJson: JSON.stringify(graphData),
          caseContextJson: JSON.stringify({
            simulationLabel: DEMO_SIMULATION_LABEL,
            targetAccount: tx.recipientAccount,
            targetBank: tx.recipientBank,
            familyEscalatedBy: guardianId,
            familyEscalationNote: note ?? null,
            escalatedTxId: tx.txId,
            escalationOrigin: originLabel,
            escalatedAt: new Date().toISOString(),
          }),
          sanitizedMinute0Json: JSON.stringify(sanitizedEvidence),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: guardianId,
        actorRole: isSelfReview ? "USER_B2C" : "FAMILY_GUARDIAN",
        action: isSelfReview ? "HOLD_REVIEW_REQUESTED" : "FAMILY_ESCALATED",
        targetId: savedCase.caseId,
        rationale:
          note?.trim() ||
          `Người thân chuyển tiếp giao dịch tạm giữ ${tx.txId} sang Phòng Điều Tra Rủi ro (chỉ gửi bằng chứng đã ẩn PII, không đính kèm ảnh gốc).`,
        metadataJson: JSON.stringify({
          txId: tx.txId,
          caseId: savedCase.caseId,
          recipientAccount: tx.recipientAccount,
        }),
      },
    });

    const payload = FamilyEscalateResponseSchema.parse({
      txId: tx.txId,
      status: "ESCALATED_TO_B2E",
      caseId: savedCase.caseId,
      caseRecord: toInvestigationCaseDto(savedCase),
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "JSON không hợp lệ.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    console.error("[POST /api/shield/family/escalate/[txId]]", err);
    return NextResponse.json(
      { error: "Không thể chuyển tiếp vụ việc lên Phòng Rủi ro.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
