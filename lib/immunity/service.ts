import { NextResponse } from "next/server";
import type { Appeal, AuditLog } from "@prisma/client";
import {
  ActorRoleSchema,
  AppealStatusSchema,
  AuditActionSchema,
  DEMO_SIMULATION_LABEL,
  ImmunityListResponseSchema,
  type ActorRole,
  type AppealDto,
  type AuditLogDto,
  type ImmunityIndicatorDto,
  type ImmunityListResponse,
} from "@/contracts";
import { prisma } from "@/lib/prisma";
import { ensureSessionSeeded, toImmunityIndicatorDto } from "@/lib/session";

export type GovernanceStatusCode = 400 | 403 | 404 | 409;

export class ImmunityGovernanceError extends Error {
  readonly statusCode: GovernanceStatusCode;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: GovernanceStatusCode,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ImmunityGovernanceError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Glossary "Nguồn bằng chứng độc lập": sources are independent only when their TYPE differs.
 * Type = prefix before the first "_" (MINUTE0_…, INTERNAL_…, SIMO_…).
 */
export function countIndependentSourceTypes(sources: string[]): number {
  return new Set(sources.map((s) => s.trim().split("_")[0].toUpperCase()).filter(Boolean)).size;
}

function parseUniqueEvidenceSources(rawJson: string): string[] {
  const parsed = safeJsonParse<unknown>(rawJson, []);
  if (!Array.isArray(parsed)) return [];
  return Array.from(
    new Set(
      parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function toAppealDto(row: Appeal): AppealDto {
  return {
    appealId: row.appealId,
    demoSessionId: row.demoSessionId,
    indicatorId: row.indicatorId,
    appellantName: row.appellantName,
    appellantNote: row.appellantNote,
    status: AppealStatusSchema.catch("PENDING_HUMAN_REVIEW").parse(row.status),
    reviewerId: row.reviewerId,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAuditLogDto(row: AuditLog): AuditLogDto {
  return {
    logId: row.logId,
    demoSessionId: row.demoSessionId,
    actorId: row.actorId,
    actorRole: ActorRoleSchema.catch("RISK_MAKER").parse(row.actorRole),
    action: AuditActionSchema.catch("DEMO_RESET").parse(row.action),
    targetId: row.targetId,
    rationale: row.rationale,
    metadata: safeJsonParse<Record<string, unknown> | null>(row.metadataJson, null),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toImmunityErrorResponse(err: unknown, routeLabel: string) {
  if (err instanceof ImmunityGovernanceError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      { status: err.statusCode },
    );
  }
  console.error(`[${routeLabel}]`, err);
  return NextResponse.json(
    {
      error: "Không thể xử lý yêu cầu quản trị Miễn dịch lúc này.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 },
  );
}

export async function listImmunityRegistry(
  demoSessionId: string,
): Promise<ImmunityListResponse> {
  await ensureSessionSeeded(demoSessionId);

  const now = new Date();
  await prisma.immunityIndicator.updateMany({
    where: {
      demoSessionId,
      status: { in: ["SOFT_WARNING", "ACTIVE"] },
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  // shortcut: caps audit log query to 100 latest entries per session; add cursor pagination if long-lived sessions grow
  const [indicators, appeals, auditLogs] = await Promise.all([
    prisma.immunityIndicator.findMany({
      where: { demoSessionId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appeal.findMany({
      where: { demoSessionId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { demoSessionId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return ImmunityListResponseSchema.parse({
    indicators: indicators.map(toImmunityIndicatorDto),
    appeals: appeals.map(toAppealDto),
    auditLogs: auditLogs.map(toAuditLogDto),
  });
}

export interface ApproveImmunityInput {
  demoSessionId: string;
  indicatorId: string;
  checkerId: string;
  checkerRole: ActorRole;
  rationale: string;
  ttlHours: number;
}

export async function approveImmunityIndicator(
  input: ApproveImmunityInput,
): Promise<ImmunityIndicatorDto> {
  const { demoSessionId, indicatorId, checkerRole, ttlHours } = input;
  const checkerId = input.checkerId.trim();
  const rationale = input.rationale.trim();

  await ensureSessionSeeded(demoSessionId);

  const indicator = await prisma.immunityIndicator.findFirst({
    where: { indicatorId, demoSessionId },
  });

  // Check Maker!=Checker conflict first when actor matches makerId so self-approval always surfaces 403 MAKER_CHECKER_CONFLICT.
  if (indicator && checkerId === indicator.makerId.trim()) {
    throw new ImmunityGovernanceError(
      403,
      "MAKER_CHECKER_CONFLICT",
      "Vi phạm nguyên tắc Maker–Checker: người phê duyệt phải khác chuyên viên đề xuất.",
      { makerId: indicator.makerId, checkerId },
    );
  }

  if (checkerRole !== "RISK_CHECKER") {
    throw new ImmunityGovernanceError(
      403,
      "FORBIDDEN_ROLE",
      "Chỉ Risk Checker (RISK_CHECKER) mới có quyền phê duyệt phát hành Miễn dịch Cộng đồng.",
      { requiredRole: "RISK_CHECKER", providedRole: checkerRole },
    );
  }

  if (!indicator) {
    throw new ImmunityGovernanceError(
      404,
      "INDICATOR_NOT_FOUND",
      "Không tìm thấy chỉ báo Miễn dịch trong phiên hiện tại.",
    );
  }

  const now = new Date();
  if (indicator.status === "SOFT_WARNING" && indicator.expiresAt <= now) {
    await prisma.immunityIndicator.update({
      where: { indicatorId: indicator.indicatorId },
      data: { status: "EXPIRED" },
    });
    throw new ImmunityGovernanceError(
      409,
      "INVALID_STATUS_TRANSITION",
      "Chỉ báo đã hết hạn TTL (EXPIRED), không thể phê duyệt kích hoạt.",
      { currentStatus: "EXPIRED" },
    );
  }

  if (indicator.status !== "PENDING_CHECKER" && indicator.status !== "SOFT_WARNING") {
    throw new ImmunityGovernanceError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Chỉ báo đang ở trạng thái ${indicator.status}, chỉ hỗ trợ phê duyệt từ PENDING_CHECKER hoặc SOFT_WARNING.`,
      { currentStatus: indicator.status },
    );
  }

  const uniqueSources = parseUniqueEvidenceSources(indicator.evidenceSourcesJson);
  const sourceTypeCount = countIndependentSourceTypes(uniqueSources);
  if (sourceTypeCount < 2) {
    throw new ImmunityGovernanceError(
      400,
      "INSUFFICIENT_EVIDENCE_SOURCES",
      "Lớp 2 yêu cầu tối thiểu 2 nguồn bằng chứng độc lập KHÁC LOẠI để kích hoạt cảnh báo rủi ro cao toàn cộng đồng.",
      { required: 2, provided: sourceTypeCount, sources: uniqueSources },
    );
  }

  const expiresAt = new Date(now.getTime() + ttlHours * 3_600_000);

  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.immunityIndicator.updateMany({
      where: {
        indicatorId: indicator.indicatorId,
        demoSessionId,
        status: { in: ["PENDING_CHECKER", "SOFT_WARNING"] },
      },
      data: {
        status: "ACTIVE",
        severity: "HIGH_RISK",
        checkerId,
        ttlHours,
        expiresAt,
        rollbackReason: null,
      },
    });
    if (claimed.count === 0) {
      throw new ImmunityGovernanceError(
        409,
        "INVALID_STATUS_TRANSITION",
        "Chỉ báo đã được phê duyệt hoặc thay đổi trạng thái bởi thao tác khác.",
      );
    }

    const row = await tx.immunityIndicator.findUniqueOrThrow({
      where: { indicatorId: indicator.indicatorId },
    });

    if (indicator.caseId) {
      await tx.investigationCase.updateMany({
        where: { caseId: indicator.caseId, demoSessionId },
        data: { status: "CLOSED" },
      });

      // Glossary "Hủy giao dịch": Kết luận rủi ro cao → B2E cancels the case's still-unexecuted hold.
      const caseRow = await tx.investigationCase.findFirst({
        where: { caseId: indicator.caseId, demoSessionId },
        select: { txId: true },
      });
      if (caseRow?.txId) {
        const cancelled = await tx.heldTransaction.updateMany({
          where: {
            txId: caseRow.txId,
            demoSessionId,
            status: { in: ["ON_HOLD_24H", "ESCALATED_TO_B2E"] },
          },
          data: { status: "CANCELLED_BY_B2E" },
        });
        if (cancelled.count > 0) {
          await tx.auditLog.create({
            data: {
              demoSessionId,
              actorId: checkerId,
              actorRole: "RISK_CHECKER",
              action: "TRANSFER_CANCELLED",
              targetId: caseRow.txId,
              rationale: "Vụ điều tra có Kết luận rủi ro cao: B2E hủy giao dịch tạm giữ chưa thực hiện.",
              metadataJson: JSON.stringify({ cancelReason: "CASE_HIGH_RISK", caseId: indicator.caseId }),
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        demoSessionId,
        actorId: checkerId,
        actorRole: "RISK_CHECKER",
        action: "IMMUNITY_APPROVED",
        targetId: indicator.indicatorId,
        rationale,
        metadataJson: JSON.stringify({
          caseId: indicator.caseId,
          indicatorType: indicator.indicatorType,
          indicatorValue: indicator.indicatorValue,
          makerId: indicator.makerId,
          evidenceSources: uniqueSources,
          ttlHours,
          expiresAt: expiresAt.toISOString(),
        }),
      },
    });

    return row;
  });

  return toImmunityIndicatorDto(updated);
}

export interface SubmitAppealInput {
  demoSessionId: string;
  indicatorId: string;
  appellantName: string;
  appellantNote: string;
  actorId: string;
}

export async function submitAppeal(input: SubmitAppealInput): Promise<AppealDto> {
  const { demoSessionId, indicatorId } = input;
  const appellantName = input.appellantName.trim();
  const appellantNote = input.appellantNote.trim();
  const actorId = input.actorId.trim();

  await ensureSessionSeeded(demoSessionId);

  const indicator = await prisma.immunityIndicator.findFirst({
    where: { indicatorId, demoSessionId },
  });
  if (!indicator) {
    throw new ImmunityGovernanceError(
      404,
      "INDICATOR_NOT_FOUND",
      "Không tìm thấy chỉ báo Miễn dịch để gửi khiếu nại.",
    );
  }

  const now = new Date();
  if (
    (indicator.status === "SOFT_WARNING" || indicator.status === "ACTIVE") &&
    indicator.expiresAt <= now
  ) {
    await prisma.immunityIndicator.update({
      where: { indicatorId: indicator.indicatorId },
      data: { status: "EXPIRED" },
    });
    throw new ImmunityGovernanceError(
      409,
      "INDICATOR_NOT_APPEALABLE",
      "Chỉ báo này đã hết hiệu lực TTL (EXPIRED) và không còn phát cảnh báo.",
      { currentStatus: "EXPIRED" },
    );
  }

  if (indicator.status !== "SOFT_WARNING" && indicator.status !== "ACTIVE") {
    throw new ImmunityGovernanceError(
      409,
      "INDICATOR_NOT_APPEALABLE",
      `Chỉ có thể gửi khiếu nại cho chỉ báo đang ở trạng thái SOFT_WARNING hoặc ACTIVE (hiện tại: ${indicator.status}).`,
      { currentStatus: indicator.status },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const appeal = await tx.appeal.create({
      data: {
        demoSessionId,
        indicatorId: indicator.indicatorId,
        appellantName,
        appellantNote,
        status: "PENDING_HUMAN_REVIEW",
      },
    });

    await tx.auditLog.create({
      data: {
        demoSessionId,
        actorId,
        actorRole: "USER_B2C",
        action: "APPEAL_SUBMITTED",
        targetId: appeal.appealId,
        rationale: appellantNote,
        metadataJson: JSON.stringify({
          indicatorId: indicator.indicatorId,
          indicatorValue: indicator.indicatorValue,
          appellantName,
          regulationBasis: "TT 53/2026/TT-NHNN",
        }),
      },
    });

    return appeal;
  });

  return toAppealDto(created);
}

export interface ResolveAppealInput {
  demoSessionId: string;
  indicatorId: string;
  appealId: string;
  reviewerId: string;
  reviewerRole: ActorRole;
  resolution: "UPHELD" | "OVERTURNED_ROLLBACK";
  resolutionNote: string;
}

export async function resolveAppeal(
  input: ResolveAppealInput,
): Promise<{ appeal: AppealDto; indicator: ImmunityIndicatorDto }> {
  const { demoSessionId, indicatorId, appealId, reviewerRole, resolution } = input;
  const reviewerId = input.reviewerId.trim();
  const resolutionNote = input.resolutionNote.trim();

  if (reviewerRole !== "RISK_CHECKER") {
    throw new ImmunityGovernanceError(
      403,
      "FORBIDDEN_ROLE",
      "Chỉ Risk Checker (RISK_CHECKER) mới có quyền rà soát và kết luận khiếu nại người thật (TT 53/2026).",
      { requiredRole: "RISK_CHECKER", providedRole: reviewerRole },
    );
  }

  await ensureSessionSeeded(demoSessionId);

  const indicator = await prisma.immunityIndicator.findFirst({
    where: { indicatorId, demoSessionId },
  });
  if (!indicator) {
    throw new ImmunityGovernanceError(
      404,
      "INDICATOR_NOT_FOUND",
      "Không tìm thấy chỉ báo Miễn dịch liên quan đến khiếu nại.",
    );
  }

  // Glossary "Khiếu nại": the reviewer must differ from the Checker who activated the indicator.
  if (indicator.checkerId && reviewerId === indicator.checkerId.trim()) {
    throw new ImmunityGovernanceError(
      403,
      "APPEAL_REVIEWER_CONFLICT",
      "Người xét khiếu nại phải khác Checker đã phê duyệt kích hoạt chỉ báo này.",
      { checkerId: indicator.checkerId, reviewerId },
    );
  }

  const appeal = await prisma.appeal.findFirst({
    where: { appealId, indicatorId, demoSessionId },
  });
  if (!appeal) {
    throw new ImmunityGovernanceError(
      404,
      "APPEAL_NOT_FOUND",
      "Không tìm thấy hồ sơ khiếu nại trong phiên hiện tại.",
    );
  }

  if (appeal.status !== "PENDING_HUMAN_REVIEW") {
    throw new ImmunityGovernanceError(
      409,
      "APPEAL_ALREADY_RESOLVED",
      `Khiếu nại này đã được xử lý với kết quả ${appeal.status}.`,
      { currentStatus: appeal.status },
    );
  }

  const { updatedAppeal, finalIndicator } = await prisma.$transaction(async (tx) => {
    const resolvedAppeal = await tx.appeal.update({
      where: { appealId: appeal.appealId },
      data: {
        status: resolution,
        reviewerId,
        resolutionNote,
      },
    });

    await tx.auditLog.create({
      data: {
        demoSessionId,
        actorId: reviewerId,
        actorRole: "RISK_CHECKER",
        action: "APPEAL_RESOLVED",
        targetId: appeal.appealId,
        rationale: resolutionNote,
        metadataJson: JSON.stringify({
          indicatorId: indicator.indicatorId,
          indicatorValue: indicator.indicatorValue,
          resolution,
        }),
      },
    });

    if (resolution === "OVERTURNED_ROLLBACK") {
      const rolledBack = await tx.immunityIndicator.update({
        where: { indicatorId: indicator.indicatorId },
        data: {
          status: "ROLLED_BACK",
          rollbackReason: resolutionNote,
          checkerId: indicator.checkerId ?? reviewerId,
        },
      });

      await tx.auditLog.create({
        data: {
          demoSessionId,
          actorId: reviewerId,
          actorRole: "RISK_CHECKER",
          action: "IMMUNITY_ROLLED_BACK",
          targetId: indicator.indicatorId,
          rationale: resolutionNote,
          metadataJson: JSON.stringify({
            appealId: appeal.appealId,
            trigger: "APPEAL_OVERTURNED_ROLLBACK",
            previousStatus: indicator.status,
            indicatorValue: indicator.indicatorValue,
          }),
        },
      });

      return { updatedAppeal: resolvedAppeal, finalIndicator: rolledBack };
    }

    return { updatedAppeal: resolvedAppeal, finalIndicator: indicator };
  });

  return {
    appeal: toAppealDto(updatedAppeal),
    indicator: toImmunityIndicatorDto(finalIndicator),
  };
}

export interface RollbackImmunityInput {
  demoSessionId: string;
  indicatorId: string;
  checkerId: string;
  checkerRole: ActorRole;
  reason: string;
}

export async function rollbackImmunityIndicator(
  input: RollbackImmunityInput,
): Promise<ImmunityIndicatorDto> {
  const { demoSessionId, indicatorId, checkerRole } = input;
  const checkerId = input.checkerId.trim();
  const reason = input.reason.trim();

  if (checkerRole !== "RISK_CHECKER") {
    throw new ImmunityGovernanceError(
      403,
      "FORBIDDEN_ROLE",
      "Chỉ Risk Checker (RISK_CHECKER) mới có quyền thu hồi (Rollback) chỉ báo Miễn dịch.",
      { requiredRole: "RISK_CHECKER", providedRole: checkerRole },
    );
  }

  await ensureSessionSeeded(demoSessionId);

  const indicator = await prisma.immunityIndicator.findFirst({
    where: { indicatorId, demoSessionId },
  });
  if (!indicator) {
    throw new ImmunityGovernanceError(
      404,
      "INDICATOR_NOT_FOUND",
      "Không tìm thấy chỉ báo Miễn dịch để thu hồi.",
    );
  }

  if (indicator.status === "ROLLED_BACK") {
    throw new ImmunityGovernanceError(
      409,
      "ALREADY_ROLLED_BACK",
      "Chỉ báo này đã được thu hồi (ROLLED_BACK) trước đó.",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.immunityIndicator.update({
      where: { indicatorId: indicator.indicatorId },
      data: {
        status: "ROLLED_BACK",
        rollbackReason: reason,
        checkerId: indicator.checkerId ?? checkerId,
      },
    });

    await tx.auditLog.create({
      data: {
        demoSessionId,
        actorId: checkerId,
        actorRole: "RISK_CHECKER",
        action: "IMMUNITY_ROLLED_BACK",
        targetId: indicator.indicatorId,
        rationale: reason,
        metadataJson: JSON.stringify({
          previousStatus: indicator.status,
          indicatorType: indicator.indicatorType,
          indicatorValue: indicator.indicatorValue,
        }),
      },
    });

    return row;
  });

  return toImmunityIndicatorDto(updated);
}

export interface ExpireDemoInput {
  demoSessionId: string;
  indicatorId: string;
  checkerId: string;
  checkerRole: ActorRole;
  rationale: string;
}

export async function expireIndicatorForDemo(
  input: ExpireDemoInput,
): Promise<ImmunityIndicatorDto> {
  const { demoSessionId, indicatorId, checkerRole } = input;
  const checkerId = input.checkerId.trim();
  const rationale = input.rationale.trim();

  if (checkerRole !== "RISK_CHECKER") {
    throw new ImmunityGovernanceError(
      403,
      "FORBIDDEN_ROLE",
      "Chỉ Risk Checker (RISK_CHECKER) mới có quyền kích hoạt giả lập hết hạn TTL.",
      { requiredRole: "RISK_CHECKER", providedRole: checkerRole },
    );
  }

  await ensureSessionSeeded(demoSessionId);

  const indicator = await prisma.immunityIndicator.findFirst({
    where: { indicatorId, demoSessionId },
  });
  if (!indicator) {
    throw new ImmunityGovernanceError(
      404,
      "INDICATOR_NOT_FOUND",
      "Không tìm thấy chỉ báo Miễn dịch để giả lập hết hạn TTL.",
    );
  }

  if (indicator.status === "EXPIRED" || indicator.status === "ROLLED_BACK") {
    throw new ImmunityGovernanceError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Chỉ báo đang ở trạng thái ${indicator.status}, không thể giả lập hết hạn TTL thêm.`,
      { currentStatus: indicator.status },
    );
  }

  const expiredAt = new Date(Date.now() - 1000);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.immunityIndicator.update({
      where: { indicatorId: indicator.indicatorId },
      data: {
        expiresAt: expiredAt,
        status: "EXPIRED",
      },
    });

    await tx.auditLog.create({
      data: {
        demoSessionId,
        actorId: checkerId,
        actorRole: "RISK_CHECKER",
        action: "IMMUNITY_EXPIRED_DEMO",
        targetId: indicator.indicatorId,
        rationale,
        metadataJson: JSON.stringify({
          previousStatus: indicator.status,
          indicatorType: indicator.indicatorType,
          indicatorValue: indicator.indicatorValue,
          expiresAt: expiredAt.toISOString(),
          simulationLabel: DEMO_SIMULATION_LABEL,
        }),
      },
    });

    return row;
  });

  return toImmunityIndicatorDto(updated);
}
