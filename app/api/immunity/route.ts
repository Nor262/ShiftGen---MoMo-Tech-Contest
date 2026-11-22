import { NextResponse } from "next/server";
import { listImmunityRegistry, toImmunityErrorResponse } from "@/lib/immunity";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const demoSessionId = getSessionId(request);
    const payload = await listImmunityRegistry(demoSessionId);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return toImmunityErrorResponse(err, "GET /api/immunity");
  }
}
