import { NextResponse } from "next/server";
import { WarRoomCasesResponseSchema } from "@/contracts";
import { prisma } from "@/lib/prisma";
import {
  ensureSessionSeeded,
  getSessionId,
  toInvestigationCaseDto,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const demoSessionId = getSessionId(request);
    await ensureSessionSeeded(demoSessionId);

    const rows = await prisma.investigationCase.findMany({
      where: { demoSessionId },
      orderBy: { createdAt: "asc" },
    });

    const payload = WarRoomCasesResponseSchema.parse({
      cases: rows.map(toInvestigationCaseDto),
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("[GET /api/warroom/cases]", err);
    return NextResponse.json(
      {
        error: "Không thể tải danh sách hồ sơ FinCrime War-Room.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
