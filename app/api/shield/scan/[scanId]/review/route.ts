import { NextResponse } from "next/server";
import { ScanReviewRequestSchema, ScanReviewResponseSchema } from "@/contracts";
import { prisma } from "@/lib/prisma";
import { checkDbRateLimit, extractClientIp } from "@/lib/rate-limit";
import { ensureSessionSeeded, getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * #5 "Nhờ người thật xem xét": the user asks a human to look at an AI scan result
 * (Luật 134/2025 Điều 4.2). Recorded in the audit log for the Risk team; no AI is called.
 */
export async function POST(request: Request, context: { params: Promise<{ scanId: string }> }) {
  try {
    const { scanId } = await context.params;
    const parsed = ScanReviewRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Yêu cầu xem xét không hợp lệ.", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
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
    const scan = await prisma.scanSession.findFirst({ where: { scanId, demoSessionId } });
    if (!scan) {
      return NextResponse.json(
        { error: "Không tìm thấy lượt quét trong phiên hiện tại.", code: "SCAN_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (scan.userId !== parsed.data.userId) {
      return NextResponse.json(
        { error: "Chỉ người đã quét mới nhờ xem xét được kết quả này.", code: "NOT_SCAN_OWNER" },
        { status: 403 },
      );
    }
    // shortcut: the request is recorded in the audit log only; add a Risk-team review queue when needed.

    const log = await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: parsed.data.userId,
        actorRole: "USER_B2C",
        action: "SCAN_REVIEW_REQUESTED",
        targetId: scanId,
        rationale: parsed.data.note?.trim() || "Người dùng nhờ người thật xem xét lại kết quả do AI tạo.",
        metadataJson: JSON.stringify({ scanId }),
      },
    });

    return NextResponse.json(
      ScanReviewResponseSchema.parse({
        scanId,
        status: "REVIEW_REQUESTED",
        requestedAt: log.createdAt.toISOString(),
      }),
    );
  } catch (err) {
    console.error("[POST /api/shield/scan/[scanId]/review]", err);
    return NextResponse.json(
      { error: "Không thể gửi yêu cầu xem xét lúc này.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
