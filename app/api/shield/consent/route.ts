import { NextResponse } from "next/server";
import { ConsentRequestSchema, ConsentResponseSchema } from "@/contracts";
import { prisma } from "@/lib/prisma";
import { ensureSessionSeeded, getSessionId, toUserConsentDto } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = ConsentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dữ liệu thiết lập đồng thuận không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);

    const { userId, optIn24hHold, guardianId, consentVersion } = parsed.data;
    const normalizedGuardianId = guardianId ?? null;

    const consent = await prisma.userConsent.upsert({
      where: {
        demoSessionId_userId: { demoSessionId, userId },
      },
      create: {
        demoSessionId,
        userId,
        optIn24hHold,
        guardianId: normalizedGuardianId,
        consentVersion,
        consentedAt: new Date(),
      },
      update: {
        optIn24hHold,
        guardianId: normalizedGuardianId,
        consentVersion,
        consentedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: userId,
        actorRole: "USER_B2C",
        action: "CONSENT_UPDATED",
        targetId: consent.id,
        rationale: optIn24hHold
          ? `Kích hoạt chế độ Bảo vệ 24h (phiên bản ${consentVersion}).`
          : `Tắt chế độ Bảo vệ 24h (phiên bản ${consentVersion}).`,
        metadataJson: JSON.stringify({
          optIn24hHold,
          guardianId: normalizedGuardianId,
          consentVersion,
        }),
      },
    });

    const payload = ConsentResponseSchema.parse({
      consent: toUserConsentDto(consent),
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[POST /api/shield/consent]", err);
    return NextResponse.json(
      { error: "Không thể cập nhật thiết lập đồng thuận.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
