import { NextResponse } from "next/server";
import {
  ResolveAppealRequestSchema,
  ResolveAppealResponseSchema,
} from "@/contracts";
import { resolveAppeal, toImmunityErrorResponse } from "@/lib/immunity";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = ResolveAppealRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu xử lý khiếu nại không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const result = await resolveAppeal({
      demoSessionId,
      indicatorId: id,
      appealId: parsed.data.appealId,
      reviewerId: parsed.data.reviewerId,
      reviewerRole: parsed.data.reviewerRole,
      resolution: parsed.data.resolution,
      resolutionNote: parsed.data.resolutionNote,
    });

    const payload = ResolveAppealResponseSchema.parse(result);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return toImmunityErrorResponse(err, "POST /api/immunity/[id]/resolve-appeal");
  }
}
