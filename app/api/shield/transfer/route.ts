import { NextResponse } from "next/server";
import {
  DEMO_SIMULATION_LABEL,
  HIGH_RISK_HOLD_THRESHOLD,
  NEUTRAL_HOLD_MESSAGE,
  TransferRequestSchema,
  TransferResponseSchema,
} from "@/contracts";
import { prisma } from "@/lib/prisma";
import {
  ensureSessionSeeded,
  getSessionId,
  lookupActiveImmunity,
  toHeldTransactionDto,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const HOLD_DURATION_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = TransferRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Thông tin giao dịch không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);

    const { userId, senderLabel, scanId, recipientAccount, recipientBank, amountVnd } =
      parsed.data;

    const [scan, immunityHit, consent] = await Promise.all([
      scanId
        ? prisma.scanSession.findFirst({
            where: { scanId, demoSessionId },
          })
        : prisma.scanSession.findFirst({
            where: { demoSessionId, userId },
            orderBy: { createdAt: "desc" },
          }),
      lookupActiveImmunity(demoSessionId, { accounts: [recipientAccount] }),
      prisma.userConsent.findUnique({
        where: { demoSessionId_userId: { demoSessionId, userId } },
      }),
    ]);

    const activeImmunityHit = immunityHit?.status === "ACTIVE";
    const riskScore = scan?.riskScore ?? 0;
    const shouldHold =
      (riskScore >= HIGH_RISK_HOLD_THRESHOLD || activeImmunityHit) &&
      Boolean(consent?.optIn24hHold);

    const now = new Date();
    const holdExpiresAt = shouldHold ? new Date(now.getTime() + HOLD_DURATION_MS) : now;
    const status = shouldHold ? "ON_HOLD_24H" : "COMPLETED";
    const neutralMessage = shouldHold
      ? NEUTRAL_HOLD_MESSAGE
      : `Giao dịch mô phỏng đã hoàn tất (${DEMO_SIMULATION_LABEL} — không kích hoạt chế độ tạm giữ 24h).`;

    const tx = await prisma.heldTransaction.create({
      data: {
        demoSessionId,
        scanId: scan?.scanId ?? null,
        senderId: userId,
        senderLabel,
        recipientAccount,
        recipientBank,
        amountVnd,
        status,
        neutralMessage,
        holdExpiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: userId,
        actorRole: "USER_B2C",
        action: shouldHold ? "TRANSFER_HELD_24H" : "TRANSFER_COMPLETED",
        targetId: tx.txId,
        rationale: shouldHold
          ? `Tạm giữ 24h theo đồng thuận trước đó (điểm rủi ro ${riskScore}, miễn dịch ACTIVE: ${activeImmunityHit}).`
          : `Hoàn tất giao dịch mô phỏng (điểm rủi ro ${riskScore}, optIn24hHold=${Boolean(consent?.optIn24hHold)}).`,
        metadataJson: JSON.stringify({
          scanId: scan?.scanId ?? null,
          riskScore,
          activeImmunityHit,
          optIn24hHold: Boolean(consent?.optIn24hHold),
          recipientAccount,
          amountVnd,
        }),
      },
    });

    const payload = TransferResponseSchema.parse({
      txId: tx.txId,
      status,
      neutralMessage,
      holdExpiresAt: shouldHold ? holdExpiresAt.toISOString() : null,
      transaction: toHeldTransactionDto(tx),
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[POST /api/shield/transfer]", err);
    return NextResponse.json(
      { error: "Không thể xử lý giao dịch mô phỏng.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
