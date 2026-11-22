import { NextResponse } from "next/server";
import {
  CaseDecisionRequestSchema,
  CaseDecisionResponseSchema,
  IMMUNITY_TTL_HOURS,
} from "@/contracts";
import { prisma } from "@/lib/prisma";
import {
  ensureSessionSeeded,
  getSessionId,
  toImmunityIndicatorDto,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = CaseDecisionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu ghi nhận quyết định điều tra không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const req = parsed.data;

    // Strict RBAC enforcement: only RISK_MAKER may record War-Room Maker decisions.
    if (req.actorRole !== "RISK_MAKER") {
      return NextResponse.json(
        {
          error:
            "Chỉ chuyên viên Risk Maker (RISK_MAKER) mới có quyền ghi nhận quyết định điều tra hồ sơ.",
          code: "FORBIDDEN_ROLE",
        },
        { status: 403 },
      );
    }

    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);

    const caseRow = await prisma.investigationCase.findFirst({
      where: { caseId, demoSessionId },
    });
    if (!caseRow) {
      return NextResponse.json(
        {
          error: "Không tìm thấy hồ sơ điều tra trong phiên hiện tại.",
          code: "CASE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (req.decision === "DISMISS_FP") {
      await prisma.$transaction([
        prisma.investigationCase.update({
          where: { caseId: caseRow.caseId },
          data: { status: "DISMISSED_FP" },
        }),
        prisma.auditLog.create({
          data: {
            demoSessionId,
            actorId: req.actorId,
            actorRole: "RISK_MAKER",
            action: "CASE_DISMISSED_FP",
            targetId: caseRow.caseId,
            rationale: req.rationale.trim(),
            metadataJson: JSON.stringify({
              scenarioCode: caseRow.scenarioCode,
              decision: "DISMISS_FP",
            }),
          },
        }),
      ]);

      const payload = CaseDecisionResponseSchema.parse({
        caseId: caseRow.caseId,
        caseStatus: "DISMISSED_FP",
        indicator: null,
      });
      return NextResponse.json(payload, { status: 200 });
    }

    // PROPOSE_IMMUNITY: deduplicate evidence sources & enforce Layer 2 (>= 2 sources) guardrail.
    const uniqueSources = Array.from(
      new Set(req.evidenceSources.map((s) => s.trim()).filter(Boolean)),
    );
    if (uniqueSources.length === 0) {
      return NextResponse.json(
        {
          error: "Cần ít nhất 1 nguồn bằng chứng độc lập hợp lệ để đề xuất Miễn dịch.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    if (req.requestedLevel === "ACTIVE" && uniqueSources.length < 2) {
      return NextResponse.json(
        {
          error: `Lớp 2 (ACTIVE Immunity) yêu cầu tối thiểu 2 nguồn bằng chứng độc lập (hiện có ${uniqueSources.length} nguồn). Vui lòng phát hành Cảnh báo mềm 72h (SOFT_WARNING) hoặc bổ sung nguồn đối chứng độc lập.`,
          code: "INSUFFICIENT_EVIDENCE_SOURCES",
          details: {
            required: 2,
            provided: uniqueSources.length,
            suggestedLevel: "SOFT_WARNING",
          },
        },
        { status: 400 },
      );
    }

    const isActiveRequest = req.requestedLevel === "ACTIVE";
    const status = isActiveRequest ? "PENDING_CHECKER" : "SOFT_WARNING";
    const severity = isActiveRequest ? "HIGH_RISK" : "SOFT_WARNING";
    const ttlHours = isActiveRequest
      ? IMMUNITY_TTL_HOURS.ACTIVE
      : IMMUNITY_TTL_HOURS.SOFT_WARNING;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const indicatorValue = req.indicatorValue.trim();

    const createdIndicator = await prisma.$transaction(async (tx) => {
      const indicator = await tx.immunityIndicator.create({
        data: {
          demoSessionId,
          caseId: caseRow.caseId,
          indicatorType: req.indicatorType,
          indicatorValue,
          severity,
          status,
          evidenceSourcesJson: JSON.stringify(uniqueSources),
          makerId: req.actorId,
          checkerId: null,
          ttlHours,
          expiresAt,
        },
      });

      await tx.investigationCase.update({
        where: { caseId: caseRow.caseId },
        data: { status: "IMMUNITY_PROPOSED" },
      });

      await tx.auditLog.create({
        data: {
          demoSessionId,
          actorId: req.actorId,
          actorRole: "RISK_MAKER",
          action: "IMMUNITY_PROPOSED",
          targetId: indicator.indicatorId,
          rationale: req.rationale.trim(),
          metadataJson: JSON.stringify({
            caseId: caseRow.caseId,
            scenarioCode: caseRow.scenarioCode,
            requestedLevel: req.requestedLevel,
            indicatorType: req.indicatorType,
            indicatorValue,
            evidenceSources: uniqueSources,
            status,
            severity,
            ttlHours,
          }),
        },
      });

      return indicator;
    });

    const payload = CaseDecisionResponseSchema.parse({
      caseId: caseRow.caseId,
      caseStatus: "IMMUNITY_PROPOSED",
      indicator: toImmunityIndicatorDto(createdIndicator),
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[POST /api/warroom/cases/[caseId]/decision]", err);
    return NextResponse.json(
      {
        error: "Không thể ghi nhận quyết định điều tra lúc này.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
