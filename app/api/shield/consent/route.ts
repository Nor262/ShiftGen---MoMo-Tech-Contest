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

    const { userId, optIn24hHold, optInScan, guardianId, consentVersion } = parsed.data;
    const normalizedGuardianId = guardianId ?? null;
    // #5: only the purposes sent are changed; the other keeps its stored value (default off).
    const changes = {
      ...(optIn24hHold !== undefined && { optIn24hHold, guardianId: normalizedGuardianId }),
      ...(optInScan !== undefined && { optInScan }),
    };

    const consent = await prisma.userConsent.upsert({
      where: {
        demoSessionId_userId: { demoSessionId, userId },
      },
      create: {
        demoSessionId,
        userId,
        optIn24hHold: false,
        optInScan: false,
        guardianId: null,
        ...changes,
        consentVersion,
        consentedAt: new Date(),
      },
      update: {
        ...changes,
        consentVersion,
        consentedAt: new Date(),
      },
    });

    // one audit entry per purpose changed, with what was agreed to and when (createdAt)
    type AuditEntry = { rationale: string; metadata: Record<string, unknown> };
    const entries: AuditEntry[] = [];
    if (optIn24hHold !== undefined)
      entries.push({
        rationale: optIn24hHold
          ? `Kích hoạt chế độ Bảo vệ 24h (phiên bản ${consentVersion}).`
          : `Tắt chế độ Bảo vệ 24h (phiên bản ${consentVersion}).`,
        metadata: { purpose: "HOLD_24H", optIn24hHold, guardianId: normalizedGuardianId, consentVersion },
      });
    if (optInScan !== undefined)
      entries.push({
        rationale: optInScan
          ? `Đồng ý cho AI phân tích nội dung khi quét (phiên bản ${consentVersion}).`
          : `Rút lại đồng ý cho AI phân tích nội dung khi quét (phiên bản ${consentVersion}).`,
        metadata: { purpose: "SCAN", optInScan, consentVersion },
      });
    for (const e of entries) {
      await prisma.auditLog.create({
        data: {
          demoSessionId,
          actorId: userId,
          actorRole: "USER_B2C",
          action: "CONSENT_UPDATED",
          targetId: consent.id,
          rationale: e.rationale,
          metadataJson: JSON.stringify(e.metadata),
        },
      });
    }

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
