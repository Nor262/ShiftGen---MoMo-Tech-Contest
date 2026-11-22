import { NextResponse } from "next/server";
import {
  FamilyHoldDtoSchema,
  FamilyHoldsResponseSchema,
  HeldTxStatusSchema,
  RiskLevelSchema,
  SanitizedEvidenceSchema,
} from "@/contracts";
import { prisma } from "@/lib/prisma";
import { ensureSessionSeeded, getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

const DEFAULT_FAMILY_SUMMARY_VI =
  "Giao dịch giá trị cao đang được tạm giữ 24h theo chế độ bảo vệ gia đình (không chia sẻ số dư, CCCD, SĐT hay lịch sử chi tiêu).";

function extractSanitizedSummary(rawJson: string | null | undefined): string {
  if (!rawJson) return DEFAULT_FAMILY_SUMMARY_VI;
  try {
    const parsed = SanitizedEvidenceSchema.safeParse(JSON.parse(rawJson));
    return parsed.success ? parsed.data.summary_vi : DEFAULT_FAMILY_SUMMARY_VI;
  } catch {
    return DEFAULT_FAMILY_SUMMARY_VI;
  }
}

export async function GET(request: Request) {
  try {
    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);

    const rows = await prisma.heldTransaction.findMany({
      where: {
        demoSessionId,
        status: { in: ["ON_HOLD_24H", "ESCALATED_TO_B2E", "CANCELLED_BY_USER", "RELEASED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const scanIds = Array.from(
      new Set(rows.map((r) => r.scanId).filter((id): id is string => Boolean(id))),
    );
    const scans =
      scanIds.length > 0
        ? await prisma.scanSession.findMany({
            where: { demoSessionId, scanId: { in: scanIds } },
            select: {
              scanId: true,
              riskScore: true,
              riskLevel: true,
              sanitizedEvidenceJson: true,
            },
          })
        : [];
    const scanMap = new Map(scans.map((s) => [s.scanId, s]));

    // Strict allow-list projection (FR-04.1): never exposes balance, CCCD, phone, raw image, or everyday spending history.
    const holds = rows.map((row) => {
      const scan = row.scanId ? scanMap.get(row.scanId) : undefined;
      return FamilyHoldDtoSchema.parse({
        txId: row.txId,
        senderLabel: row.senderLabel,
        recipientAccount: row.recipientAccount,
        recipientBank: row.recipientBank,
        amountVnd: row.amountVnd,
        riskScore: scan ? scan.riskScore : null,
        riskLevel: scan ? RiskLevelSchema.catch("HIGH").parse(scan.riskLevel) : null,
        sanitizedSummaryVi: extractSanitizedSummary(scan?.sanitizedEvidenceJson),
        status: HeldTxStatusSchema.catch("ON_HOLD_24H").parse(row.status),
        neutralMessage: row.neutralMessage,
        holdExpiresAt: row.holdExpiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      });
    });

    const payload = FamilyHoldsResponseSchema.parse({ holds });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/shield/family/holds]", err);
    return NextResponse.json(
      { error: "Không thể tải danh sách giao dịch tạm giữ gia đình.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
