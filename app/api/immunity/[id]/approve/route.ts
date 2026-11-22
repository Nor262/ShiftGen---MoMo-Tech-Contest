import { NextResponse } from "next/server";
import {
  ApproveImmunityRequestSchema,
  ApproveImmunityResponseSchema,
} from "@/contracts";
import { approveImmunityIndicator, toImmunityErrorResponse } from "@/lib/immunity";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = ApproveImmunityRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu phê duyệt Miễn dịch không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const indicator = await approveImmunityIndicator({
      demoSessionId,
      indicatorId: id,
      checkerId: parsed.data.checkerId,
      checkerRole: parsed.data.checkerRole,
      rationale: parsed.data.rationale,
      ttlHours: parsed.data.ttlHours,
    });

    const payload = ApproveImmunityResponseSchema.parse({ indicator });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return toImmunityErrorResponse(err, "POST /api/immunity/[id]/approve");
  }
}
