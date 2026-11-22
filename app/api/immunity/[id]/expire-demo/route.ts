import { NextResponse } from "next/server";
import {
  ExpireDemoRequestSchema,
  ExpireDemoResponseSchema,
} from "@/contracts";
import { expireIndicatorForDemo, toImmunityErrorResponse } from "@/lib/immunity";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = ExpireDemoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu giả lập hết hạn TTL không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const indicator = await expireIndicatorForDemo({
      demoSessionId,
      indicatorId: id,
      checkerId: parsed.data.checkerId,
      checkerRole: parsed.data.checkerRole,
      rationale: parsed.data.rationale,
    });

    const payload = ExpireDemoResponseSchema.parse({ indicator });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return toImmunityErrorResponse(err, "POST /api/immunity/[id]/expire-demo");
  }
}
