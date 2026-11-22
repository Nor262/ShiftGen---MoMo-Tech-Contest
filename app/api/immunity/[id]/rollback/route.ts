import { NextResponse } from "next/server";
import {
  RollbackImmunityRequestSchema,
  RollbackImmunityResponseSchema,
} from "@/contracts";
import { rollbackImmunityIndicator, toImmunityErrorResponse } from "@/lib/immunity";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = RollbackImmunityRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu thu hồi (Rollback) không hợp lệ. Vui lòng nhập lý do tối thiểu 3 ký tự.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const indicator = await rollbackImmunityIndicator({
      demoSessionId,
      indicatorId: id,
      checkerId: parsed.data.checkerId,
      checkerRole: parsed.data.checkerRole,
      reason: parsed.data.reason,
    });

    const payload = RollbackImmunityResponseSchema.parse({ indicator });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return toImmunityErrorResponse(err, "POST /api/immunity/[id]/rollback");
  }
}
