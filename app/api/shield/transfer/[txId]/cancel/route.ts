import { NextResponse } from "next/server";
import { CancelTransferRequestSchema, CancelTransferResponseSchema } from "@/contracts";
import { prisma } from "@/lib/prisma";
import { getSessionId, toHeldTransactionDto } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ txId: string }> },
) {
  try {
    const { txId } = await context.params;
    const rawBody = await request.text();
    const parsedBody = rawBody.trim() ? JSON.parse(rawBody) : {};
    const parsed = CancelTransferRequestSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu hủy giao dịch không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const existing = await prisma.heldTransaction.findFirst({
      where: { txId, demoSessionId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy giao dịch trong phiên hiện tại.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    if (existing.status !== "ON_HOLD_24H") {
      return NextResponse.json(
        {
          error: `Chỉ có thể hủy giao dịch đang ở trạng thái tạm giữ 24h (hiện tại: ${existing.status}).`,
          code: "INVALID_STATE",
        },
        { status: 409 },
      );
    }

    const updated = await prisma.heldTransaction.update({
      where: { txId: existing.txId },
      data: { status: "CANCELLED_BY_USER" },
    });

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: parsed.data.userId,
        actorRole: "USER_B2C",
        action: "TRANSFER_CANCELLED",
        targetId: updated.txId,
        rationale:
          parsed.data.reason?.trim() || "Người dùng chủ động hủy giao dịch đang tạm giữ 24h.",
        metadataJson: JSON.stringify({
          previousStatus: existing.status,
          recipientAccount: existing.recipientAccount,
          amountVnd: existing.amountVnd,
        }),
      },
    });

    const payload = CancelTransferResponseSchema.parse({
      txId: updated.txId,
      status: "CANCELLED_BY_USER",
      transaction: toHeldTransactionDto(updated),
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "JSON không hợp lệ.", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }
    console.error("[POST /api/shield/transfer/[txId]/cancel]", err);
    return NextResponse.json(
      { error: "Không thể hủy giao dịch.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
