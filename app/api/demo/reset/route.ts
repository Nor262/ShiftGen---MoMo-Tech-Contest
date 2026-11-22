import { NextResponse } from "next/server";
import {
  getSessionId,
  resetDemoSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { DemoResetResponseSchema } from "@/contracts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const sessionId = getSessionId(request);
    const result = await resetDemoSession(sessionId);
    const payload = DemoResetResponseSchema.parse({
      ok: true,
      sessionId: result.sessionId,
      seededCasesCount: result.seededCasesCount,
    });

    const response = NextResponse.json(payload, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("[POST /api/demo/reset]", err);
    return NextResponse.json(
      { error: "Database unavailable for demo reset", code: "DB_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
