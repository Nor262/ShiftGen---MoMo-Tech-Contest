import { NextResponse } from "next/server";
import { ConsentResponseSchema, GuardianActionRequestSchema } from "@/contracts";
import { prisma } from "@/lib/prisma";
import { checkDbRateLimit, extractClientIp } from "@/lib/rate-limit";
import { ensureSessionSeeded, getSessionId, toUserConsentDto } from "@/lib/session";

export const dynamic = "force-dynamic";

// shortcut: ownerId / guardianId are client-asserted (see lib/guardian.ts).
/**
 * #6: the invited guardian ACCEPTs; the wallet owner REVOKEs at any time.
 * Each step is audited; invitations are created by POST /api/shield/consent (guardianId).
 */
export async function POST(request: Request) {
  try {
    const parsed = GuardianActionRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Yêu cầu không hợp lệ.", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
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

    const body = parsed.data;
    const consent = await prisma.userConsent.findUnique({
      where: { demoSessionId_userId: { demoSessionId, userId: body.ownerId } },
    });

    if (body.action === "ACCEPT") {
      if (!consent || consent.guardianId !== body.guardianId || consent.guardianStatus !== "INVITED") {
        return NextResponse.json(
          { error: "Không có lời mời làm người giám hộ nào đang chờ bạn.", code: "NO_PENDING_INVITATION" },
          { status: 403 },
        );
      }
    } else if (!consent || !consent.guardianId || consent.guardianStatus === "REVOKED") {
      return NextResponse.json(
        { error: "Không có người giám hộ nào để thu hồi.", code: "NO_GUARDIAN" },
        { status: 409 },
      );
    }

    const accepting = body.action === "ACCEPT";
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.userConsent.update({
        where: { id: consent!.id },
        data: { guardianStatus: accepting ? "ACCEPTED" : "REVOKED" },
      });
      await tx.auditLog.create({
        data: {
          demoSessionId,
          actorId: accepting ? body.guardianId : body.ownerId,
          actorRole: accepting ? "FAMILY_GUARDIAN" : "USER_B2C",
          action: accepting ? "GUARDIAN_ACCEPTED" : "GUARDIAN_REVOKED",
          targetId: consent!.id,
          rationale: accepting
            ? `Người giám hộ ${body.guardianId} xác nhận lời mời của ${body.ownerId}.`
            : `Chủ ví ${body.ownerId} thu hồi quyền người giám hộ ${consent!.guardianId}.`,
          metadataJson: JSON.stringify({ ownerId: body.ownerId, guardianId: consent!.guardianId }),
        },
      });
      return row;
    });

    return NextResponse.json(ConsentResponseSchema.parse({ consent: toUserConsentDto(updated) }));
  } catch (err) {
    console.error("[POST /api/shield/family/guardian]", err);
    return NextResponse.json(
      { error: "Không thể cập nhật người giám hộ lúc này.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
