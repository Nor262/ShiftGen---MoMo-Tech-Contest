import { NextResponse } from "next/server";
import {
  CreateAppealRequestSchema,
  CreateAppealResponseSchema,
} from "@/contracts";
import { submitAppeal, toImmunityErrorResponse } from "@/lib/immunity";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = CreateAppealRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Hồ sơ khiếu nại không hợp lệ. Vui lòng nhập đầy đủ họ tên và lý do.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const appeal = await submitAppeal({
      demoSessionId,
      indicatorId: id,
      appellantName: parsed.data.appellantName,
      appellantNote: parsed.data.appellantNote,
      actorId: parsed.data.actorId,
    });

    const payload = CreateAppealResponseSchema.parse({ appeal });
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    return toImmunityErrorResponse(err, "POST /api/immunity/[id]/appeal");
  }
}
